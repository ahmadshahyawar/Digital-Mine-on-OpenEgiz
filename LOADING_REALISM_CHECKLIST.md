# Loading-Face and Truck-Interaction Realism Checklist

This checklist targets the current loading-area defects: trucks intersecting one another, unclear equipment roles, unrealistic spotting, weak payload transfer, and scenario behavior that is not sufficiently visible. It is a visual and operational improvement plan, not a claim of engineering or safety validation.

## A. Loading-area layout

1. [x] Separate the active loading bay from the truck approach lane.
2. Separate the departure lane from the loading queue.
3. Place the excavator on a stable bench beside the muck pile.
4. Keep the excavator outside all truck wheel paths.
5. Create one clearly marked truck spotting position.
6. Create a dedicated loading-queue holding line.
7. Provide enough turning radius for the haul-truck model.
8. Prevent the loading bay from overlapping the pit wall.
9. Place the muck pile within realistic excavator reach.
10. Add a safe escape corridor behind the excavator.

## B. Truck approach and separation

11. Enforce a minimum following distance between moving trucks.
12. Enforce a larger minimum distance for queued trucks.
13. Prevent two trucks from occupying the loading bay.
14. Prevent trucks from passing through the excavator.
15. Prevent trucks from passing through the muck pile.
16. Prevent trucks from passing through parked trucks.
17. Slow a truck as it approaches the queue.
18. Stop a truck at the end of the queue rather than at a shared coordinate.
19. Move every queue position when the leading truck advances.
20. Preserve queue order while trucks advance.

## C. Spotting maneuver

21. Add an approach state before spotting.
22. Add a low-speed turn into the loading bay.
23. Align the truck bed toward the excavator bucket.
24. Stop the truck completely before loading begins.
25. Keep the truck cab away from the excavator swing zone.
26. Show brake lights or a stopped-status marker while spotted.
27. Use a short positioning delay before the first bucket pass.
28. Reject loading if the truck is not inside the spotting tolerance.
29. Keep the truck stationary for the complete loading event.
30. Release the truck only after the final bucket clears the bed.

## D. Excavator behavior

31. Keep the excavator base stationary during loading.
32. Rotate only the upper structure instead of the whole machine.
33. Animate the boom lowering toward the muck pile.
34. Animate the stick extending into the pile.
35. Animate the bucket curling while digging.
36. Raise the filled bucket before swinging.
37. Swing the bucket toward the truck bed.
38. Pause above the bed before releasing ore.
39. Return the empty bucket to the muck pile.
40. Repeat the correct number of bucket passes for one truck payload.

## E. Ore-transfer behavior

41. Emit falling ore only when the bucket is over the truck bed.
42. Stop the ore stream between bucket passes.
43. Keep falling rocks inside the bed footprint.
44. Prevent ore particles from originating inside the truck body.
45. Prevent ore particles from passing through the cab.
46. Use several rock sizes instead of identical particles.
47. Add a short dust puff when ore impacts the bed.
48. Limit dust so software rendering remains usable.
49. Synchronize each visual bucket pass with load progress.
50. Complete loading only after the final visual pass.

## F. Truck payload appearance

51. Keep empty beds visibly empty before loading.
52. Increase visible bed fill after every bucket pass.
53. Shape the load as an uneven rock pile rather than a solid box.
54. Keep the pile below the bed’s safe visual boundary.
55. Prevent rocks from floating above the truck.
56. Prevent the payload from intersecting the truck cab.
57. Preserve the full load throughout loaded travel.
58. Preserve the full load while waiting at the crusher.
59. Reduce the visible load progressively during dumping.
60. Keep the bed empty throughout the return journey.

## G. Departure and cycle continuity

61. Add a loading-complete state before departure.
62. Confirm the excavator bucket is clear before truck movement.
63. Accelerate the loaded truck gradually out of the bay.
64. Merge the departing truck into the correct outbound lane.
65. Prevent departure through waiting trucks.
66. Advance the next queued truck only after the bay is clear.
67. Preserve the departing truck’s identity color and number.
68. Preserve payload state when transitioning to haulage.
69. Keep truck direction consistent through the merge.
70. Record the exact loading-bay release time for cycle metrics.

## H. Safety and operational clarity

71. Add visible loading-bay boundary markings.
72. Add a no-entry zone around the excavator rear swing radius.
73. Add berms along exposed loading-bench edges.
74. Add warning markers at the queue entrance.
75. Highlight only the truck currently authorized to enter.
76. Show the number of trucks waiting without stacking models.
77. Show whether the excavator resource is busy or available.
78. Show whether the loading bay is occupied.
79. Use distinct colors for waiting, loading, hauling, and breakdown.
80. Keep every safety indicator readable from the overview camera.

## I. Scenario-specific realism

81. During normal operations, rotate trucks through the queue fairly.
82. During a truck breakdown, freeze the failed truck at its actual location.
83. Prevent following trucks from driving through a broken truck.
84. Reroute or queue following trucks according to available road space.
85. During road restriction, reduce approach and haul speeds consistently.
86. Keep loading possible during a road restriction unless access is blocked.
87. During crusher slowdown, allow the loading queue to respond to downstream congestion.
88. Show growing crusher/ROM congestion without overlapping truck models.
89. On reset, restore valid queue order and vehicle spacing.
90. Preserve payload and mass balance through every scenario transition.

## J. Camera, performance, and verification

91. Add a loading-face camera preset.
92. Frame the excavator, active truck, queue, and muck pile together.
93. Keep truck scale large enough to inspect bed contents.
94. Use level-of-detail or simple particles to protect software-WebGL performance.
95. Avoid expensive transparent dust layers and dynamic shadows.
96. Add a visual test for truck-to-truck intersection.
97. Add a visual test for truck-to-excavator intersection.
98. Add a state test for loading order and bay exclusivity.
99. Capture screenshots of empty, half-full, full, and dumping states.
100. Accept the loading sequence only after human review confirms that roles, spacing, motion, and payload flow are immediately understandable.

## Recommended implementation stages

1. **Collision-free layout:** items 1–20.
2. **Correct spotting and equipment roles:** items 21–40.
3. **Payload transfer and persistent fill:** items 41–60.
4. **Departure, safety, and scenarios:** items 61–90.
5. **Camera, performance, and evidence:** items 91–100.

