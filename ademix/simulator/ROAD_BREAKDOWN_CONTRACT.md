# Two-way road breakdown contract

Version: `ademix.road-breakdown.v1`

The accepted 3D road has two separated direction lanes. The simulator therefore treats a road failure
as a blockage of the failed truck's lane, not as closure of the whole road. This is deterministic
synthetic behavior for the demonstration twin, not a claim about a real mine traffic-control plan.

## Direction rule

- Heading `1`, lane `crusher_bound`: loaded travel from the face to the crusher.
- Heading `-1`, lane `face_bound`: empty return from the crusher to the face.
- A failed HT-01 keeps its payload and position.
- Only trucks in the same lane approaching the failure point stop there in state `blocked`, speed 0.
- Opposing traffic continues at the active road speed.
- After 1,200 simulated seconds HT-01 is considered towed clear. Every stopped follower resumes from
  its actual progress. HT-01 stays in `breakdown` until Normal operations resets the scenario.
- A failure in a queue, loading bay, dump bay or standby line does not create a road blockage.
- `road_closure` remains a reduced-speed restriction on both lanes. No reroute is modelled.

## `road-main` twin fields

| Field | Type | Unit | Values / meaning |
|---|---|---|---|
| `traffic_model` | string | — | Always `two_way_separated_lanes`. |
| `blockage_lane` | string | — | `none`, `crusher_bound`, or `face_bound`. |
| `blockage_heading` | integer | — | `0`, `1`, or `-1`, matching the affected lane. |
| `blocked_trucks` | integer | trucks | Total followers currently stopped by the failure. |
| `blocked_crusher_bound_trucks` | integer | trucks | Stopped heading `1` followers. |
| `blocked_face_bound_trucks` | integer | trucks | Stopped heading `-1` followers. |
| `blockage` | string | — | Human-readable failed truck, lane, route position and tow time; `none` when clear. |
| `state` | string | — | `restricted` during a speed restriction or active lane blockage; otherwise `open`. |
| `speed_limit_kmh` | number | km/h | Shared limit; 25 normally or 10.72 in the road-restriction scenario. |

Existing API routes and MQTT/Ditto delivery are unchanged. Values are published by the normal engine
snapshot, so the frontend must not infer the affected lane from screen position.

## Presentation handoff

Use `blockage_lane` to identify the affected lane and the two directional counters to explain the impact.
Do not show the opposing lane as closed. A safe label is: “HT-01 blocks the crusher-bound lane; opposing
empty traffic continues.” Use the equivalent face-bound wording when heading is `-1`.

On reset, require `blockage_lane=none`, `blockage_heading=0`, every blocked counter `0`, and no truck in
`blocked` or `breakdown`. Do not describe `road_closure` as a closure or reroute: it is a speed restriction.
