# Ademix twin relationship contract

Schema: `ademix.twin-relationships.v1`

The machine-readable contract is `ademix/data/topology/twin_relationships.json`. It describes only the
eleven Eclipse Ditto twins already returned by `GET /api/state`; it does not create asset twins, add
telemetry, or change simulation behavior. The generated frontend data bundle exposes the document as
`twinRelationships`.

## Identity and live-state join

- `thing_id` is the exact Ditto ID and the only authoritative join key.
- `id` is the namespace-free display key used elsewhere in Ademix.
- `parent_thing_id` reproduces the existing `attributes._parents` hierarchy. The mine has no parent.
- `state_feature` names the returned feature that an explorer may display. Read its value from
  `features.<state_feature>.properties.value` on the matching live twin.
- If a twin or state feature is unavailable, display **State unavailable**. Do not infer a state from a
  relationship or from screen position.

Selecting a graph node must select the same live twin by `thing_id`; the relationship document is never a
substitute for current Ditto state.

## Relationship semantics

Every relationship is directed from `source` to `target`.

| Category | Types | Meaning |
| --- | --- | --- |
| `hierarchy` | `contains` | The mine is the existing OpenEgiz parent of the equipment/controller twin. |
| `material` | `loads`, `delivers_to`, `processes_ore_for` | Ore moves from excavator to truck, truck to crusher, then through mine production accounting. |
| `movement` | `travels_on` | Each truck uses the single modelled two-way haul road. |
| `control` | `changes_operating_condition_of`, `sets_dispatch_policy_for` | The scenario controller changes scenario conditions and the dispatch policy. These are visually distinct from ore flow. |

The readable material path is **loading face / excavator → haul truck → haul road → crusher**. The road
edge is movement rather than ore transfer, so a graph should place it between truck and crusher spatially
without relabelling `travels_on` as a material edge.

## Limits and safe claims

- The document models operational relationships, not a physical network protocol or surveyed plant graph.
- Trucks share one road twin; there is no alternate-route twin.
- The crusher twin represents the dump bay, ROM bin and primary crusher together.
- The scenario controller is software/control logic, not physical equipment.
- Relationship presence does not prove that an asset is currently active; current state comes from Ditto.
- This contract is a team-authored representation of the deterministic conceptual model, not field validation.

Regenerate the frontend bundle with:

```bash
python ademix/data/build_data_layer.py
```
