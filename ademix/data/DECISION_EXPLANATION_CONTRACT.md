# A8/A9 Decision workspace contract

Frontend owner: Professor + Claude  
Evidence/meaning owner: Ahmad + Codex  
Schema: `ademix.decision-explanation.v1`

Generate the contract from the authoritative A8/A9 fixtures:

```bash
python ademix/data/build_decision_explanation.py --write
```

Professor + Claude should consume
`evidence/decision_explanation.json` in the existing Decision workspace. The
frontend must not reproduce fleet calculations or invent a second recommendation.

The contract directly answers four judge questions:

1. Baseline: four trucks reach the 770 t/h loader limit; five and six add queueing
   and operating hours without adding output.
2. Road restriction: throughput still rises from four to five to six trucks, so
   all six remain useful and no plateau is claimed in the tested range.
3. Crusher slowdown: three trucks already feed the 495 t/h crusher limit; extra
   trucks add crusher queues and truck-hours without increasing output.
4. Sensitivity: route length, loading duration and crusher capacity each move the
   useful-fleet boundary in at least one tested planning case.

Required presentation behavior:

- label the values `saved model evidence`, `synthetic` and `not measured`;
- keep saved evidence visually distinct from current live twin state;
- show `unavailable` and suppress the recommendation if required data is missing;
- use the contract's rounding rules;
- reset only the live scenario—never rewrite the saved fixture;
- name the tested assumption behind every changed recommendation.

Frontend acceptance is not complete until a judge can answer all four questions
from one workspace and displayed values match the JSON exactly after rounding.
