/**
 * Sentinel Console – Entry Point
 * Demonstrates the full Cognitive Core pipeline.
 */

import { SentinelPipeline } from "./pipeline.js";
import type { SensorData } from "./contracts/types.js";

const pipeline = new SentinelPipeline();

// Simulated Joker Firmware stream
const demoSensors: SensorData[] = [
  {
    sensor_id: "temp_01",
    location_tag: "JOKER_MAIN",
    sequence_id: 1001,
    timestamp: Date.now() - 8000,
    metrics: { temperature: 62, vibration: 0.2 },
    is_rising: false,
  },
  {
    sensor_id: "temp_01",
    location_tag: "JOKER_MAIN",
    sequence_id: 1002,
    timestamp: Date.now() - 6000,
    metrics: { temperature: 68, vibration: 0.3 },
    is_rising: true,
  },
  {
    sensor_id: "temp_01",
    location_tag: "JOKER_MAIN",
    sequence_id: 1003,
    timestamp: Date.now() - 4000,
    metrics: { temperature: 74, vibration: 0.45 },
    is_rising: true,
  },
  {
    sensor_id: "vib_02",
    location_tag: "JOKER_MAIN",
    sequence_id: 2001,
    timestamp: Date.now() - 3000,
    metrics: { vibration: 0.7, temperature: 71 },
    is_rising: true,
  },
  {
    sensor_id: "temp_01",
    location_tag: "JOKER_MAIN",
    sequence_id: 1004,
    timestamp: Date.now() - 1000,
    metrics: { temperature: 81, vibration: 0.55 },
    is_rising: true,
  },
];

console.log("🛡️  Sentinel Console – Cognitive Core online\n");

for (const s of demoSensors) {
  const alert = pipeline.processSensor(s);
  if (alert) {
    console.log("🚨 ALERT");
    console.log(`   ${alert.title} [${alert.severity}]`);
    console.log(`   Evidence: ${alert.evidence_summary}`);
    if (alert.predicted_state) console.log(`   Predicted: ${alert.predicted_state}`);
    if (alert.recommended_preemptive_action)
      console.log(`   Action: ${alert.recommended_preemptive_action}`);
    console.log(`   Confidence: ${(alert.confidence_score * 100).toFixed(0)}% | Quality: ${alert.data_quality_flag}`);
    if (alert.self_heal_recommendation)
      console.log(`   Self-Heal: ${alert.self_heal_recommendation}`);
    console.log("");
  }
}

if (pipeline.lastMetaEvents.length) {
  console.log("🧠 MetaEvents emitted:", pipeline.lastMetaEvents.length);
}
if (pipeline.lastPolicyUpdates.length) {
  console.log("🔧 PolicyUpdates applied:", pipeline.lastPolicyUpdates.length);
}

console.log("\n✅ Pipeline demonstration complete.");
