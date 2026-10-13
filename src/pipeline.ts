/**
 * Sentinel Console – Pipeline Orchestrator
 * Wires the 4-Stage Data Firewall and closes the metacognitive loop.
 */

import type { SensorData, AlertData, MetaEvent, PolicyUpdate } from "./contracts/types.js";
import { InputValidator } from "./firewall/InputValidator.js";
import { PermissionEngine } from "./firewall/PermissionEngine.js";
import { ContextEngine } from "./firewall/ContextEngine.js";
import { ActionSynthesizer } from "./firewall/ActionSynthesizer.js";

export class SentinelPipeline {
  private validator = new InputValidator();
  private permission = new PermissionEngine();
  private context: ContextEngine;
  private synthesizer = new ActionSynthesizer();

  // Feedback sinks (can be observed by UI / firmware bridge)
  public lastMetaEvents: MetaEvent[] = [];
  public lastPolicyUpdates: PolicyUpdate[] = [];

  constructor() {
    this.context = new ContextEngine(this.permission);
  }

  /**
   * Process a single SensorData packet through the full firewall.
   * Returns the resulting AlertData (or null if filtered).
   */
  process(raw: unknown): AlertData | null {
    // Stage 1
    const sensor = this.validator.validate(raw);
    if (!sensor) return null;

    // Stage 2
    const event = this.permission.evaluate(sensor);

    // Stage 3
    const enriched = this.context.enrich(event);

    // Stage 4
    const { alert, metaEvent, policyUpdate } = this.synthesizer.synthesize(enriched);

    // Close the metacognitive loop
    if (metaEvent) this.lastMetaEvents.push(metaEvent);
    if (policyUpdate) {
      this.lastPolicyUpdates.push(policyUpdate);
      this.permission.applyPolicyUpdate(policyUpdate);
      this.validator.applyPolicyUpdate(policyUpdate);
    }

    return alert;
  }

  /** Convenience: process a typed SensorData object */
  processSensor(sensor: SensorData): AlertData | null {
    return this.process(sensor);
  }
}
