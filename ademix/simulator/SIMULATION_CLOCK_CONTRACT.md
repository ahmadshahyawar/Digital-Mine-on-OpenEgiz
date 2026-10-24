# Ademix authoritative simulation-clock contract

Schema: `ademix.simulation-clock.v1`

The clock is published on `org.openegiz.ademix:mine-01` through the same simulator → MQTT → Eclipse Ditto → API path as production state.

| Feature | Type | Unit | Meaning |
| --- | --- | --- | --- |
| `sim_time_s` | number | s | Current elapsed modeled time since the run began. |
| `simulation_speed_multiplier` | number > 0 | x | Simulated seconds advanced per wall-clock second. The default deployment is 20×. |
| `simulation_mode` | string | — | `openegiz_live`, `local_demo`, or `offline_model`. |

At 20×, one modeled hour takes approximately 180 wall-clock seconds. At 5× it takes approximately 720 seconds; at 1× it takes 3,600 seconds. Scheduler and host load can add wall-time delay, but they do not change modeled results.

## Invariant

The multiplier controls only how quickly the demonstration advances in wall time. It does **not** change:

- modeled route length or truck speed;
- loading, travel, dumping, tow or recovery durations measured in simulated time;
- FIFO ordering, resource availability or scenario equations;
- tonnes, trips, queues or mass balance at the same simulated timestamp.

Tests run the same seeded engine for one modeled hour at 1×, 5× and 20× and require identical operational results.

## Consumer rules

- Read all three fields from the returned `mine-01` twin. Never hard-code `20×` as a separate UI truth.
- Use `simulation_speed_multiplier` for truck interpolation and the visible clock label.
- Label `openegiz_live` as live OpenEgiz state and `local_demo` as local demo; never present `offline_model` evidence as a live connection.
- When any clock field is missing, show `Simulation time unavailable` or another truthful fallback. Do not infer 20×.
- Historical A3 timestamps are simulated seconds and remain unchanged by playback or live multiplier.

## Known limitation

The backend scheduler targets the configured ratio; Windows/Docker scheduling and browser rendering may make wall-clock observation slower. The authoritative operational comparison is always at equal simulated time, not equal wall time.

