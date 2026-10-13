/**
 * Sentinel Console – Core Data Contracts
 * SensorData → EventData → AlertData
 */

export interface SensorData {
  sensor_id: string;
  location_tag: string;          // e.g. "JOKER_MAIN"
  sequence_id: number;           // monotonically increasing
  timestamp: number;             // Unix ms
  metrics: Record<string, number>;
  is_rising?: boolean;           // local trend hint from firmware
  raw?: unknown;
}

export interface RelationalTag {
  related_event_id: string;
  relation_type: "temporal" | "spatial" | "permission" | "causal";
  weight: number;                // 0–1
  time_delta_ms?: number;
  spatial_distance?: number;
}

export interface CausalityChain {
  nodes: string[];               // event_ids in path order
  edges: RelationalTag[];
  summary: string;
}

export interface PredictiveHorizon {
  probability: number;           // 0–1 of exceeding threshold
  eta_ms: number | null;         // estimated time to threshold
  confidence: number;            // model confidence 0–1
  predicted_values: number[];    // next 3–5 points
  recommended_preemptive_action?: string;
}

export interface EventData {
  event_id: string;
  sensor_id: string;
  location_tag: string;
  sequence_id: number;
  timestamp: number;
  metrics: Record<string, number>;
  validated: boolean;
  permission_granted: boolean;
  // Enrichment from ContextEngine
  relational_tags?: RelationalTag[];
  causality_chain?: CausalityChain;
  predictive_horizon?: PredictiveHorizon;
  context_notes?: string[];
}

export interface MetaScore {
  confidence: number;            // 0–1
  data_quality_flag: "good" | "degraded" | "suspect";
  policy_conflict: boolean;
  self_heal_recommendation?: string;
}

export interface AlertData {
  alert_id: string;
  event_id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  evidence_summary: string;
  causality_chain?: CausalityChain;
  predicted_state?: string;
  recommended_preemptive_action?: string;
  confidence_score: number;
  data_quality_flag: MetaScore["data_quality_flag"];
  self_heal_recommendation?: string;
  timestamp: number;
  meta?: MetaScore;
}

export interface PolicyUpdate {
  type: "threshold_adjust" | "sensor_health" | "permission_tweak";
  target: string;
  value: unknown;
  reason: string;
  generated_at: number;
}

export interface MetaEvent {
  meta_id: string;
  source_alert_id: string;
  code: string;                  // e.g. "TEMP_DRIFT_HIGH"
  payload: Record<string, unknown>;
  timestamp: number;
}
