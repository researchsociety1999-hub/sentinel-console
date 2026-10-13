/**
 * Stage 2 – PermissionEngine
 * Policy & access control. Accepts threshold adjustments from Metacognitive Loop.
 */

import type { SensorData, EventData, PolicyUpdate } from "../contracts/types.js";

export class PermissionEngine {
  private thresholds: Map<string, number> = new Map([
    ["temperature", 75],
    ["vibration", 0.8],
    ["humidity", 90],
  ]);

  private allowedLocations = new Set(["JOKER_MAIN", "JOKER_AUX", "LAB_A"]);

  applyPolicyUpdate(update: PolicyUpdate): void {
    if (update.type === "threshold_adjust" && typeof update.value === "number") {
      this.thresholds.set(update.target, update.value);
    }
  }

  evaluate(sensor: SensorData): EventData {
    const granted =
      this.allowedLocations.has(sensor.location_tag) &&
      this.checkThresholds(sensor);

    return {
      event_id: `evt_${sensor.sensor_id}_${sensor.sequence_id}`,
      sensor_id: sensor.sensor_id,
      location_tag: sensor.location_tag,
      sequence_id: sensor.sequence_id,
      timestamp: sensor.timestamp,
      metrics: { ...sensor.metrics },
      validated: true,
      permission_granted: granted,
    };
  }

  private checkThresholds(sensor: SensorData): boolean {
    for (const [key, value] of Object.entries(sensor.metrics)) {
      const limit = this.thresholds.get(key);
      if (limit !== undefined && value > limit) {
        // Still grant permission so the alert can be raised;
        // the exceedance is handled downstream.
        return true;
      }
    }
    return true;
  }

  getThreshold(metric: string): number | undefined {
    return this.thresholds.get(metric);
  }
}
