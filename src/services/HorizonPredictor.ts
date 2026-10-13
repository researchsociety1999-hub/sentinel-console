/**
 * Horizon Predictor (G_02 – Temporal / Predictive Intelligence)
 * Rolling average + Simple Exponential Smoothing (SES).
 * Predicts next 3–5 points and probability of threshold exceedance.
 */

import type { EventData, PredictiveHorizon } from "../contracts/types.js";

interface SeriesState {
  values: number[];
  lastSmoothed: number;
}

export class HorizonPredictor {
  private series = new Map<string, SeriesState>(); // key = sensor_id:metric
  private readonly ALPHA = 0.3;                    // SES smoothing factor
  private readonly WINDOW = 12;
  private readonly FORECAST_STEPS = 4;

  private key(sensorId: string, metric: string) {
    return `${sensorId}:${metric}`;
  }

  ingest(event: EventData): void {
    for (const [metric, value] of Object.entries(event.metrics)) {
      const k = this.key(event.sensor_id, metric);
      let state = this.series.get(k);
      if (!state) {
        state = { values: [], lastSmoothed: value };
        this.series.set(k, state);
      }
      state.values.push(value);
      if (state.values.length > this.WINDOW) state.values.shift();

      // SES update
      state.lastSmoothed =
        this.ALPHA * value + (1 - this.ALPHA) * state.lastSmoothed;
    }
  }

  predict(
    event: EventData,
    thresholds: Map<string, number>
  ): PredictiveHorizon | undefined {
    // Use the first metric that has a threshold as the primary signal
    let primaryMetric: string | null = null;
    let threshold: number | null = null;

    for (const metric of Object.keys(event.metrics)) {
      const t = thresholds.get(metric);
      if (t !== undefined) {
        primaryMetric = metric;
        threshold = t;
        break;
      }
    }
    if (!primaryMetric || threshold === null) return undefined;

    const state = this.series.get(this.key(event.sensor_id, primaryMetric));
    if (!state || state.values.length < 3) return undefined;

    // Simple linear trend from last smoothed value
    const recent = state.values.slice(-3);
    const slope = (recent[2] - recent[0]) / 2;
    const predicted: number[] = [];
    let level = state.lastSmoothed;

    for (let i = 1; i <= this.FORECAST_STEPS; i++) {
      level = level + slope; // naive drift
      predicted.push(Number(level.toFixed(3)));
    }

    // Probability of exceeding threshold in the horizon
    const exceedCount = predicted.filter((v) => v > threshold!).length;
    const probability = exceedCount / this.FORECAST_STEPS;

    let eta_ms: number | null = null;
    if (probability > 0 && slope > 0) {
      const stepsToThreshold = Math.ceil((threshold - state.lastSmoothed) / slope);
      // assume ~2 s sampling for critical sensors
      eta_ms = Math.max(0, stepsToThreshold * 2000);
    }

    const confidence = Math.min(0.95, 0.4 + state.values.length * 0.05);

    return {
      probability,
      eta_ms,
      confidence,
      predicted_values: predicted,
      recommended_preemptive_action:
        probability > 0.6
          ? `Preemptively lower load or cool ${primaryMetric} (P=${(probability * 100).toFixed(0)}%)`
          : undefined,
    };
  }
}
