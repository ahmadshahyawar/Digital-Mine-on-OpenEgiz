# Instructions for AI agents

This repository is a Team Repository of the contest “Digital Mine on OpenEgiz”: [Rules](https://openegiz-contest.github.io/rules/). You work on it with the Team. The platform is documented in [OPENEGIZ.md](OPENEGIZ.md).

Before planning, editing, or reviewing this repository, read `PROJECT_CONTEXT.md`, `RULES_CHECKLIST.md`, `START_HERE.md`, `COLLABORATION.md`, and `TEAM_WORK_PLAN.md` in full, followed by the relevant numbered work note. Treat them as the shared source of truth for project goals, competition requirements, team status, active work, decisions, ownership, integration, release gates, and handoffs.

For every new change, follow the repeating cycle in `START_HERE.md`: fetch, confirm prior work is integrated, branch from the latest shared integration state, edit only owned paths, test, push a feature branch, hand off, integrate and test both workstreams together, then push the updated shared integration branch. Do not start a dependent feature from an unintegrated branch.

## The Concept comes from the Team

The first section of [SUBMISSION.md](SUBMISSION.md), “Concept”, is the Team's own choice, written before any code:

1. Which mining enterprise, or which part of it, the twin represents.
2. Who uses the twin.
3. Which decision the twin helps them make.
4. Why this choice.

Plus: is the object real or fictional; if fictional, which real objects it resembles and where its numbers come from.

Preserve the Team's answers in their words. Do not replace the Team's concept with the Default Solution or invent unsupported facts.

If the Team asks you to choose for them, tell them: what you would choose is the Default Solution, what AI agents build from this Template without a Concept. The Organizer publishes it on the [contest site](https://openegiz-contest.github.io/) as the low bar, and a Submission that does not go beyond it gets low levels in the Rubric. Then ask the questions again.

## Organizer updates

At the start of each session run `git fetch origin`. If `origin/main` has commits you do not have (the Organizer's updates have messages starting with `Contest update:`), tell the Team what they change and merge them. A pull request titled `Contest update: …` is an Organizer update too: tell the Team about it.

## The Example Mine

`examples/mine` is a sample of how a digital mine is built on OpenEgiz, not a base for the Submission: the Team's mine follows its Concept. Only what the Team creates is evaluated.

Questions about the Rules: [GitHub Discussions](https://github.com/openegiz-contest/openegiz-contest.github.io/discussions).

After meaningful work, update the relevant status and handoff sections in `PROJECT_CONTEXT.md`. Preserve human changes, do not duplicate active work, and never commit credentials or fabricate data or validation claims.
