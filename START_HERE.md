# Ademix — start here

This page is for Ahmad, Professor, Codex and Claude. The AI agents manage the technical workflow so the humans do not need to remember every Git detail.

## Who does what

- **Ahmad + Codex:** simulation, calculations, digital twins, MQTT/Ditto, data evidence, backend tests and release integration.
- **Professor + Claude:** 3D mine, interface, charts, explanations, animations and visual checks.
- Both sides read the same project context and understand the complete mine.

Professor + Claude's assigned implementation ends after B6. Ahmad + Codex own all C tasks; Codex may prepare nonvisual C contracts during B work and begins C frontend edits only after B6 is accepted and integrated.

## The branch that combines both sides

`origin/codex/ademix` is the current shared integration branch: the latest tested combination of both workstreams.

- Codex feature branches use `codex/<feature>`.
- Claude feature branches use `claude/<feature>`.
- `main` receives only the final accepted submission.

## Repeat this for every new change

1. **Sync:** fetch GitHub and read the shared files.
2. **Check integration:** confirm previous Codex and Claude handoffs are included in `origin/codex/ademix`.
3. **Combine first:** if completed work is waiting, integrate and test it before starting another dependent feature.
4. **Start fresh:** create the new feature branch from the latest shared integration branch.
5. **Stay in your lane:** edit only owned files; request missing fields through a handoff.
6. **Test:** run the relevant tests and report what actually ran.
7. **Push:** commit and push the feature branch to GitHub with a handoff.
8. **Integrate:** Ahmad + Codex combine backend and frontend handoffs, run the end-to-end tests, and push the updated shared integration branch.
9. **Repeat:** start the next change from the newly integrated branch.

Do not stack a dependent feature on an old unintegrated branch. Do not push unfinished or untested work to `main`.

## Files both agents read

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `RULES_CHECKLIST.md`
4. `START_HERE.md`
5. `COLLABORATION.md`
6. `TEAM_WORK_PLAN.md`
7. `01_AHMAD_CODEX_WORK.md` or `02_PROFESSOR_CLAUDE_WORK.md`
8. `03_HIGH_SCORE_IMPROVEMENTS.md` after A1–A5 and B1–B6 are completed and integrated
9. `A6_A11_SCORE_FOCUSED_IMPROVEMENTS.md` for score-focused optional extensions; A6 is recommended, A7–A11 run only when their release value exceeds their risk
10. `04_AI_JUDGE_READINESS.md` last, after all required improvements are completed and integrated

## Handoff required after every pushed feature

```text
Owner and task number:
Branch and commit SHA:
Exact files changed:
Contract/API fields changed or unchanged:
Tests actually run and results:
Screenshots/evidence:
Known limitations:
What the other AI must do:
Integration instruction:
```

## Rules that protect the submission

- Preserve the Team-written Concept in `SUBMISSION.md`.
- Never invent data, sources, test results or validation claims.
- Never commit credentials or private data.
- The UI must show state returned through OpenEgiz, not a disconnected fake simulation.
- Only the final commit on official `main` is submitted at the contest freeze.
- A feature is complete only after it is integrated and tested with the other workstream.

When the humans request a change, the AI manages this cycle and asks them only for decisions that genuinely require human judgment.
