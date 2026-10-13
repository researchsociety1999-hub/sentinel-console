/**
 * G2 UI / Frontend hooks (placeholders)
 * These interfaces describe the data the G2 surface should consume.
 * Actual React/Vue/Svelte components live in the PWA shell.
 */

import type { AlertData, CausalityChain } from "../contracts/types.js";

/** Props for the Causality Chain visualization component (Phase 1) */
export interface CausalityChainViewProps {
  chain: CausalityChain;
  onNodeClick?: (eventId: string) => void;
}

/** Props for the Predictive Timeline / Arc (Phase 2) */
export interface PredictiveTimelineProps {
  predictedValues: number[];
  probability: number;
  etaMs: number | null;
  threshold?: number;
}

/** Props for confidence / quality indicators + Self-Heal CTA (Phase 3) */
export interface MetaIndicatorsProps {
  confidence: number;
  dataQualityFlag: AlertData["data_quality_flag"];
  selfHealRecommendation?: string;
  onAcceptSelfHeal?: () => void;
}

/** Aggregate alert card model for the G2 dashboard */
export interface AlertCardModel {
  alert: AlertData;
  showCausality: boolean;
  showPrediction: boolean;
  showMeta: boolean;
}

export function toAlertCard(alert: AlertData): AlertCardModel {
  return {
    alert,
    showCausality: !!alert.causality_chain,
    showPrediction: !!alert.predicted_state,
    showMeta: true,
  };
}
