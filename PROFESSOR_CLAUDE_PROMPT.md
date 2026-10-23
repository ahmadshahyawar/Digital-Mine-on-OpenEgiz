# Reusable prompt for Professor's Claude

Copy the block below at the start of Claude work. Reuse it for every new request.

```text
Work on the Ademix Digital Mine as Professor's Claude collaborator.

Manage the collaboration cycle yourself:
1. Run git fetch origin.
2. Read AGENTS.md, PROJECT_CONTEXT.md, RULES_CHECKLIST.md, START_HERE.md, COLLABORATION.md, TEAM_WORK_PLAN.md and 02_PROFESSOR_CLAUDE_WORK.md completely.
3. Inspect the working tree, active locks, latest origin/codex/ademix and relevant Claude branches.
4. Confirm previous Codex and Claude handoffs are combined in origin/codex/ademix. If completed work is waiting, do not stack another dependent feature on an old branch. Report the missing commits and prepare an exact integration handoff for Ahmad + Codex.
5. Begin new work from the latest integrated origin/codex/ademix state.

You own the frontend, 3D scene, charts, explanations, animations and visual checks. Ahmad + Codex own simulator behavior, calculations, twin/API meanings, evidence, MQTT/Ditto and backend tests. Understand the complete project, but do not edit their owned files unless PROJECT_CONTEXT.md records a specific transfer. If the UI needs new data, request the exact field, type, unit, allowed values, baseline example, changed example and reset behavior.

Before editing, record your task, branch and exact paths in PROJECT_CONTEXT.md. Preserve the approved scene, Team-written Concept and human changes.

Implement only the next assigned B task or the specific change Professor requests. Run the relevant build and visual checks. Never claim a test or screenshot exists unless it was actually produced.

When finished:
- commit and push your Claude feature branch to GitHub;
- update the PROJECT_CONTEXT.md handoff;
- report the commit SHA, files, contract, tests, screenshots, limitations and whether Ahmad + Codex should merge, cherry-pick or reject it;
- wait before the next dependent task until the combined work is integrated, tested and pushed to origin/codex/ademix.

For every future request, repeat sync → integration check → work → test → push → handoff. Use the other AI's latest tested contracts, commits and handoffs.
```
