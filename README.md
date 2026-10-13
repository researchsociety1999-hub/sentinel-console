# Sentinel Console

**Cognitive Core for the SGP Joker Card** — private local-first PWA telemetry intelligence dashboard with a secure cloud-agent integration path.

## Architecture: 4-Stage Data Firewall

```
SensorData
    ↓
InputValidator          → schema & integrity checks
    ↓
PermissionEngine        → policy & access control
    ↓
ContextEngine           → enrichment + Causal Graph + Horizon Predictor
    ↓
ActionSynthesizer       → AlertData + Metacognitive scoring
    ↓
AlertData (with confidence, causality chain, predictive horizon)
```

### Core Contracts
- `SensorData` → raw telemetry from Joker Firmware
- `EventData` → validated + context-enriched event
- `AlertData` → actionable alert with evidence, prediction, and self-heal recommendation

### Autonomous Features (from Cognitive Audit)
| Gap | Feature | Stage Injection |
|-----|---------|-----------------|
| G_01 Relational | Causal Graph Context Engine | ContextEngine |
| G_02 Temporal/Predictive | Horizon Predictor (SES) | ContextEngine (parallel) |
| G_03 Metacognitive | Metacognitive Feedback Loop | ActionSynthesizer → PermissionEngine / InputValidator |

## Project Structure

```
src/
├── contracts/          # SensorData, EventData, AlertData types
├── firewall/           # 4-stage pipeline
│   ├── InputValidator.ts
│   ├── PermissionEngine.ts
│   ├── ContextEngine.ts
│   └── ActionSynthesizer.ts
├── services/           # Intelligence services
│   ├── CausalGraph.ts
│   ├── HorizonPredictor.ts
│   └── MetacognitiveLoop.ts
├── pipeline.ts         # Orchestrator
└── index.ts
```

## Implementation Roadmap Status

- [x] **Phase 1** – Foundational Relational Intelligence (Causal Graph)
- [x] **Phase 2** – Predictive Horizon & Trend Awareness (Horizon Predictor)
- [x] **Phase 3** – Metacognitive Autonomy & Self-Healing (Feedback Loop)

## Quick Start

```bash
npm install
npm run build
npm test
```

## License
Private – researchsociety1999-hub
