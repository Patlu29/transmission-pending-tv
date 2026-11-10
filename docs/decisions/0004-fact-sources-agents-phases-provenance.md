# 0004: Source agent roles, phases and provenance from repo documents

## Status
Accepted (2026-11-10)

## Context
The user decided the intro openly names Claude Code, the application-builder plugin, the model (Claude Opus 5.5, `claude-opus-5-5`), each agent role and the phases. These must be real data (FR-9), but git alone does not record them. The only in-repo records are the handoff notes (one per agent, written by the agents) and `docs/project-status.md` (kept by the tech lead). Commit messages carry `Co-Authored-By: Claude Opus 5.5 <...>` trailers.

## Decision
- **Agent roles:** the set of `docs/handoffs/<agent-id>.md` files. Each must start with `# Handoff: <agent-id>`, matching the file name. Roles are ordered by the commit that first added each note; uncommitted notes come last. Display labels come from a label map in `scripts/facts/config.ts`.
- **Phases:** a `## Phases` table (`#`, `Phase`, `Status`) in `docs/project-status.md`. Status must be exactly `Not started`, `In progress` or `Done`, rows are numbered 1 to n, and at most one row is `In progress`.
- **Provenance:** a `## Build provenance` table (`Item`, `Value`) in `docs/project-status.md`, with rows Tool, Plugin, Plugin version, Model and Model ID. The model is cross-checked against git: `modelCoAuthoredCommitCount` counts matching `Co-Authored-By` trailers, and strict builds stop if it is 0.
- Rejected: parsing `Phase N:` prefixes from commit subjects, because only some commits carry them and they do not name future phases. Rejected: reading the plugin's own files from `~/.claude`, because they are outside the repo and absent in CI.

## Consequences
- The role list grows truthfully as agents hand off; it never names an agent that has not written a note.
- Phase and provenance facts depend on the tech lead keeping two tables accurate, in the same commit as each phase change. The parser is strict and QA re-parses independently, but a wrong value typed into the table would still be repeated. The trailer cross-check limits this for the model name.
- Until the tech lead adds the tables, `phases` and `provenance` are `null`. Local builds pass with a warning while no template uses them; strict builds stop.
