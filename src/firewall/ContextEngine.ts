/**
 * Stage 3 – ContextEngine
 * Base enrichment + injection of Causal Graph & Horizon Predictor.
 */

import type { EventData } from "../contracts/types.js";
import { CausalGraph } from "../services/CausalGraph.js";
import { HorizonPredictor } from "../services/HorizonPredictor.js";
import type { PermissionEngine } from "./PermissionEngine.js";

export class ContextEngine {
  private graph = new CausalGraph();
  private predictor = new HorizonPredictor();

  constructor(private permissionEngine: PermissionEngine) {}

  enrich(event: EventData): EventData {
    if (!event.permission_granted) return event;

    // 1. Ingest into predictive model
    this.predictor.ingest(event);

    // 2. Add to causal graph and query relationships
    this.graph.addEvent(event);
    const { tags, chain } = this.graph.queryGraph(event.event_id);

    // 3. Generate predictive horizon
    const thresholds = new Map<string, number>();
    // Pull live thresholds from PermissionEngine
    for (const metric of Object.keys(event.metrics)) {
      const t = this.permissionEngine.getThreshold(metric);
      if (t !== undefined) thresholds.set(metric, t);
    }
    const horizon = this.predictor.predict(event, thresholds);

    return {
      ...event,
      relational_tags: tags,
      causality_chain: chain ?? undefined,
      predictive_horizon: horizon,
      context_notes: [
        tags.length > 0 ? `Found ${tags.length} relational links` : "No close relations",
        horizon
          ? `Predictive P(exceed)=${(horizon.probability * 100).toFixed(0)}%`
          : "Insufficient history for forecast",
      ],
    };
  }
}
