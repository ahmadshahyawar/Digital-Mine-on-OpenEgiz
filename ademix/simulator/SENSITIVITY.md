# A9 one-at-a-time sensitivity evidence

This deterministic planning study reuses the complete A8 2–6 truck experiment.
It changes exactly one explicitly labelled input per comparison and restores the
live engine constants after generation. It is synthetic model evidence, not a
probability analysis, measured uncertainty or real-site validation.

Regenerate the versioned fixture from the repository root:

```bash
python ademix/simulator/sensitivity.py --write
```

| Input varied | Tested values | Recommended active trucks | Boundary demonstrated |
|---|---|---|---|
| One-way route length | 2.0, 3.2, 5.0 km | 3, 4, at least 6 | Longer routes require more trucks to keep the excavator supplied; at 5 km no plateau appears through six trucks. |
| Loading duration | 6, 9, 12 min/truck | 4, 3, 3 | A slower loading resource becomes the limit and reduces the fleet needed to keep it busy. |
| Crusher capacity | 500, 700, 900 t/h | 3, 4, 4 | Below the 770 t/h loading limit, crusher capacity changes both the constraint and useful fleet size. |

The baseline remains 3.2 km, 6 min/truck and 900 t/h. Alternative values are
planning cases, not newly sourced site measurements. The full fixture records
all inputs, categories, fleet curves, bottlenecks, throughput, queues,
truck-hours per 1,000 t and mass balance in
`../data/evidence/fleet_sensitivity.json`.
