/**
 * Stage 4 – ActionSynthesizer
 * Produces AlertData and runs Metacognitive scoring.
 * Feedback is returned so the pipeline can close the loop.
 */

import type {
  EventData,
  AlertData,
  MetaEvent,
  PolicyUpdate,
} from "../contracts/types.js";
import { MetacognitiveLoop } from "../services/MetacognitiveLoop.js";

export class ActionSynthesizer {
  private meta = new MetacognitiveLoop();
  private alertCounter = 0;

  synthesize(event: EventData): {
    alert: AlertData | null;
    metaEvent: MetaEvent | null;
    policyUpdate: PolicyUpdate | null;
  } {
    if (!event.permission_granted) {
      return { alert: null, metaEvent: null, policyUpdate: null };
    }

    // Decide severity from metrics + predictive horizon
    let severity: AlertData["severity"] = "info";
    const maxMetric = Math.max(...Object.values(event.metrics), 0);
    if (maxMetric > 90 || (event.predictive_horizon?.probability ?? 0) > 0.8) {
      severity = "critical";
    } else if (maxMetric > 70 || (event.predictive_horizon?.probability ?? 0) > 0.5) {
      severity = "warning";
    }

    // Only emit alerts for warning+ or when prediction is strong
    if (severity === "info" && (event.predictive_horizon?.probability ?? 0) < 0.4) {
      return { alert: null, metaEvent: null, policyUpdate: null };
    }

    this.alertCounter += 1;
    const alertId = `alert_${Date.now()}_${this.alertCounter}`;

    const evidenceParts = [
      `Sensor ${event.sensor_id} @ ${event.location_tag}`,
      `Metrics: ${JSON.stringify(event.metrics)}`,
    ];
    if (event.causality_chain) {
      evidenceParts.push(event.causality_chain.summary);
    }
    if (event.predictive_horizon) {
      evidenceParts.push(
        `Forecast: P=${(event.predictive_horizon.probability * 100).toFixed(0)}%` +
          (event.predictive_horizon.eta_ms
            ? `, ETA ${Math.round(event.predictive_horizon.eta_ms / 1000)}s`
            : "")
      );
    }

    const alert: AlertData = {
      alert_id: alertId,
      event_id: event.event_id,
      severity,
      title: `${severity.toUpperCase()}: ${event.sensor_id} anomaly`,
      evidence_summary: evidenceParts.join(" | "),
      causality_chain: event.causality_chain,
      predicted_state: event.predictive_horizon
        ? `Next values ≈ [${event.predictive_horizon.predicted_values.join(", ")}]`
        : undefined,
      recommended_preemptive_action:
        event.predictive_horizon?.recommended_preemptive_action,
      confidence_score: 0, // filled by meta
      data_quality_flag: "good",
      timestamp: Date.now(),
    };

    // Metacognitive scoring
    const metaScore = this.meta.score(alert);
    alert.confidence_score = metaScore.confidence;
    alert.data_quality_flag = metaScore.data_quality_flag;
    alert.self_heal_recommendation = metaScore.self_heal_recommendation;
    alert.meta = metaScore;

    const { metaEvent, policyUpdate } = this.meta.generateFeedback(alert, metaScore);

    return { alert, metaEvent, policyUpdate };
  }
}
