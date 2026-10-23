# Traffic and Facility Collision Checklist

This checklist is complete only when all ten items are implemented and visually reviewed.

- [x] 1. Keep the main haul road outside every building footprint.
- [x] 2. Provide a dedicated crusher-entry spur from the main road.
- [x] 3. Provide a separate crusher-exit spur back to the return lane.
- [x] 4. Put the dumping truck in a marked bay outside the hopper wall.
- [x] 5. Keep the crusher queue outside the active dumping bay.
- [x] 6. Enforce minimum spacing between trucks moving in the same direction.
- [x] 7. Enforce clearance between trucks moving in opposite directions.
- [x] 8. Prevent trucks from entering pedestrian and dust-control zones.
- [x] 9. Add physical barriers around buildings, conveyors, and people.
- [x] 10. Verify all truck states visually: loading, hauling, queueing, dumping, and returning.

Implementation note: the main road and both crusher spurs have separate geometry. `HaulerOnRoad`
uses those same paths for vehicle placement, holds the FIFO queue back at progress 0.17 or greater,
targets one external marked dump bay, and checks every registered truck before advancing.
