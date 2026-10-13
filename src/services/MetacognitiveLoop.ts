/**
 * Metacognitive Feedback Loop (G_03)
 * Scores every AlertData, emits MetaEvents, and produces PolicyUpdates
 * that flow back into PermissionEngine & InputValidator.
 */

import type {
  AlertData,
  MetaScore,
  MetaEvent,
  PolicyUpdate,
} from "../contracts/types.js";

export class MetacognitiveLoop {
  private recentConfidences: number[] = [];
  private readonly HISTORY = 30;

  score(alert: AlertData): MetaScore {
    // Simple heuristics – extend with real drift detection later
    let confidence = 0.85;

    if (alert.causality_chain && alert.causality_chain.nodes.length > 1) {
      confidence += 0.08;
    }
    if (alert.predicted_state) {
      confidence += 0.05;
    }
    if (alert.severity === "critical" && !alert.causality_chain) {
      confidence -= 0.15; // lone critical without context is suspicious
    }

    confidence = Math.max(0.1, Math.min(0.99, confidence));

    this.recentConfidences.push(confidence);
    if (this.recentConfidences.length > this.HISTORY) {
      this.recentConfidences.shift();
    }

    const avg =
      this.recentConfidences.reduce((a, b) => a + b, 0) /
      this.recentConfidences.length;

    let data_quality_flag: MetaScore["data_quality_flag"] = "good";
    if (avg < 0.55) data_quality_flag = "suspect";
    else if (avg < 0.7) data_quality_flag = "degraded";

    const self_heal =
      data_quality_flag !== "good"
        ? `Raise ${alert.severity} threshold or request sensor recalibration for ${alert.event_id}`
        : undefined;

    return {
      confidence,
      data_quality_flag,
      policy_conflict: false,
      self_heal_recommendation: self_heal,
    };
  }

  /** Generate MetaEvent + optional PolicyUpdate from a low-confidence alert */
  generateFeedback(alert: AlertData, meta: MetaScore): {
    metaEvent: MetaEvent | null;
    policyUpdate: PolicyUpdate | null;
  } {
    if (meta.confidence >= 0.65 && meta.data_quality_flag === "good") {
      return { metaEvent: null, policyUpdate: null };
    }

    const code =
      meta.data_quality_flag === "suspect"
        ? "DATA_QUALITY_SUSPECT"
        : "CONFIDENCE_DRIFT_HIGH";

    const metaEvent: MetaEvent = {
      meta_id: `meta_${alert.alert_id}`,
      source_alert_id: alert.alert_id,
      code,
      payload: {
        confidence: meta.confidence,
        flag: meta.data_quality_flag,
        recommendation: meta.self_heal_recommendation,
      },
      timestamp: Date.now(),
    };

    let policyUpdate: PolicyUpdate | null = null;
    if (meta.self_heal_recommendation) {
      policyUpdate = {
        type: "threshold_adjust",
        target: "temperature", // example – real impl would parse metric
        value: 80,            // slightly raised to reduce false positives
        reason: meta.self_heal_recommendation,
        generated_at: Date.now(),
      };
    }

    return { metaEvent, policyUpdate };
  }
}
