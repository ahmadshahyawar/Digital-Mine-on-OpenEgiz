# Final truth and security audit

Date: 2026-10-25

Candidate basis: `caf6ee0` plus release documentation and presentation updates on `codex/final-release-audit`.

## Checks performed

- Searched current README, submission and presentation source for obsolete truck, field, test, port, breakdown and Smart Dispatch claims.
- Searched tracked source and text for common private-key and hosted-token signatures.
- Confirmed `deploy/compose/.env` is ignored and not tracked.
- Reviewed LIVE, local-demo, replay, stale and unavailable behavior in the API and frontend.
- Compared scenario wording with the implemented restriction, directional breakdown and reset behavior.
- Kept synthetic telemetry, model comparisons and planning assumptions separate from measured-site claims.

## Findings and disposition

- Corrected the release-facing 107-test and 141-field figures to 93 simulator/API/evidence tests, 48 data tests and 143 required fields/units.
- Removed the obsolete presentation statements that described three trucks, the old shared-lane 581.6 t/h case, Smart Dispatch as future work and port 8090.
- Preserved the Team-authored Concept text. Release-facing scenario tables and limitations state that the implemented road event is a 10.72 km/h restriction with no reroute.
- No hosted API token signature was found in tracked project work. The organizer template contains example Hono certificate keys under `charts/hono/example/certs/`; they are public example material inherited from the platform, not Ademix deployment credentials.
- API failure returns HTTP 503 rather than fallback state. The frontend distinguishes Eclipse Ditto live state, local demo and recorded replay, and model-truth fields render **Unavailable** when missing.

## Remaining limitations

- Native Ubuntu results require the GitHub Ubuntu workflow or a separate Ubuntu 24.04 amd64 host.
- Human visual acceptance and measured software-render results are separate release gates.
