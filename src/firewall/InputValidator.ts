/**
 * Stage 1 – InputValidator
 * Schema & integrity checks on raw SensorData.
 * Accepts firmware_feedback_listener updates for sensor health flags.
 */

import type { SensorData, PolicyUpdate } from "../contracts/types.js";

export class InputValidator {
  private sensorHealth: Map<string, "healthy" | "degraded" | "offline"> = new Map();

  /** Apply adaptive policy from Metacognitive Feedback Loop */
  applyPolicyUpdate(update: PolicyUpdate): void {
    if (update.type === "sensor_health" && typeof update.value === "string") {
      this.sensorHealth.set(update.target, update.value as any);
    }
  }

  validate(raw: unknown): SensorData | null {
    if (!raw || typeof raw !== "object") return null;
    const d = raw as Partial<SensorData>;

    if (
      typeof d.sensor_id !== "string" ||
      typeof d.location_tag !== "string" ||
      typeof d.sequence_id !== "number" ||
      typeof d.timestamp !== "number" ||
      !d.metrics ||
      typeof d.metrics !== "object"
    ) {
      return null;
    }

    const health = this.sensorHealth.get(d.sensor_id) ?? "healthy";
    if (health === "offline") return null;

    return {
      sensor_id: d.sensor_id,
      location_tag: d.location_tag,
      sequence_id: d.sequence_id,
      timestamp: d.timestamp,
      metrics: d.metrics as Record<string, number>,
      is_rising: d.is_rising,
      raw: d.raw,
    };
  }
}
