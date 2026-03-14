---
name: design-doc-factory
description: End-to-end design doc pipeline. Produces a design doc via Codex, review-loops the high-level design, adds a detailed phased plan, then review-loops the full document. Two on-ramps: (A) user prompt describing what to design, (B) user provides an existing design doc.
---

# Design Doc Factory

## Overview
Fully automated pipeline that takes a design doc from idea to implementation-ready artifact. Chains four sub-skills in sequence, using sub-agents to keep context fresh between stages.

## Trigger
Use this skill when:
- User says "design doc factory", "full design doc pipeline", or "create and refine a design doc"
- User wants an end-to-end design doc with both high-level design and detailed implementation plan, fully reviewed
- User provides a design doc and wants it reviewed, detailed-planned, and polished

## On-Ramps

### On-Ramp A: From User Prompt (default)
- **Trigger**: User provides a description of what they want designed (e.g., "design doc factory for adding Orbit data integration")
- **Entry point**: Stage 1 (Produce)
- **Flow**: Stage 1 → Stage 2 → Stage 3 → Stage 4

### On-Ramp B: From Existing Design Doc
- **Trigger**: User provides a path to an existing design doc (e.g., "run design doc factory on design-docs/add_orbit_data.md")
- **Entry point**: Stage 2 (Review-Loop on high-level design)
- **Flow**: Stage 2 → Stage 3 → Stage 4

## Execution Model — READ THIS FIRST

This skill orchestrates four stages. Each stage runs in its own sub-agent to keep context fresh. You are the **orchestrator** — your job is to kick off each stage, wait for it to complete, check the result, and kick off the next stage.

**After EVERY sub-agent returns, ask yourself**: "Did this stage succeed?" If yes, immediately proceed to the next stage. Do NOT present intermediate results to the user and wait for instructions. The only valid stopping points are:
1. All 4 stages complete → print final summary
2. A stage surfaces an unresolvable open question that requires user input → pause and ask
3. A stage fails in a way that cannot be recovered → report the failure

## Stages

### Stage 1: Produce Design Doc (Codex MCP → `/design-doc-producer`)
*Skipped if using On-Ramp B.*

- Invoke the design doc producer via the **`mcp__codex__codex` MCP tool** with these parameters:
  - `prompt`: `/design-doc-producer <user's prompt/description>`
  - `model`: `codex-5.3`
  - `cwd`: the repository root (`/Users/a.chon/Projects/Fetch/deck-generator`)
  - `sandbox`: `read-only`
  - `approval-policy`: `on-failure`
- This creates a high-level design doc in `design-docs/`.
- Extract the **design doc file path** from the output. You will need it for all subsequent stages.
- **→ IMMEDIATELY proceed to Stage 2. Do not present the draft to the user.**

### Stage 2: Review-Loop on High-Level Design (Sub-Agent → `/design-doc-loop`)

- Spawn a **sub-agent** (via the Agent tool) with this prompt:

  ```
  Run /design-doc-loop on <design-doc-file-path>.
  This is the high-level review pass — focus feedback on architecture, data flow, alternatives, and design completeness.
  Do NOT review implementation details (there are none yet).
  Report back when the loop completes: either "clean review" or the open question needing user input.
  ```

- Wait for the sub-agent to return.
- If the sub-agent reports an **open question needing user input**: pause and present it to the user. Resume from this point after the user answers.
- If the sub-agent reports **clean review**: proceed to Stage 3.
- **→ On clean review, IMMEDIATELY proceed to Stage 3.**

### Stage 3: Add Detailed Phased Plan (Sub-Agent → `/design-doc-detailed-planner`)

- Spawn a **sub-agent** (via the Agent tool) with this prompt:

  ```
  Run /design-doc-detailed-planner on <design-doc-file-path>.
  The high-level design has been reviewed and is clean. Append a phased implementation plan with low-level code details, exact signatures, and concrete tests.
  Report back when complete.
  ```

- Wait for the sub-agent to return.
- **→ IMMEDIATELY proceed to Stage 4.**

### Stage 4: Review-Loop on Full Document (Sub-Agent → `/design-doc-loop`)

- Spawn a **sub-agent** (via the Agent tool) with this prompt:

  ```
  Run /design-doc-loop on <design-doc-file-path>.
  This is the full-document review pass — review BOTH the high-level design AND the phased implementation plan.
  Focus especially on: phase correctness, test coverage, dependency ordering, and consistency between high-level design and implementation details.
  Report back when the loop completes: either "clean review" or the open question needing user input.
  ```

- Wait for the sub-agent to return.
- If the sub-agent reports an **open question needing user input**: pause and present it to the user.
- If the sub-agent reports **clean review**: the pipeline is **done**.

## Output Format

After each stage completes, print a brief status line:

```
--- Stage N: <Stage Name> complete ---
Result: <clean review / detailed plan appended / design doc created at path>
Proceeding to Stage N+1...
```

On pipeline completion:

```
--- Design Doc Factory Complete ---
Design doc: <file path>
Stages completed: N/4
Final status: [Clean / Paused for user input]
```

## Common Failure Modes — AVOID THESE

### Failure: Stopping after Stage 1 to show the draft
**Symptom**: Codex produces a design doc, you present it to the user, and wait.
**Fix**: Stage 1 output is input to Stage 2. Immediately spawn the review-loop sub-agent.

### Failure: Stopping after a review-loop reports "clean"
**Symptom**: Stage 2 reports clean review, you tell the user the doc is clean, and stop.
**Fix**: "Clean" means ready for the NEXT stage, not that the pipeline is done. Only stop after Stage 4.

### Failure: Running stages in the main context instead of sub-agents
**Symptom**: Context bloats, later stages produce lower quality output.
**Fix**: Stages 2, 3, and 4 MUST run in sub-agents via the Agent tool. Only Stage 1 (Codex MCP call) runs in the orchestrator context.

### Failure: Not extracting the design doc path from Stage 1
**Symptom**: Subsequent stages don't know which file to operate on.
**Fix**: After Stage 1, parse the Codex output for the file path (typically `design-docs/<name>.md`). If unclear, glob for the most recently modified file in `design-docs/`.

## Important Notes

- **Sub-agents are mandatory** for Stages 2-4. Each stage gets a fresh context window.
- **Stage 1 uses Codex MCP** (`mcp__codex__codex`) for a second-model perspective on the initial design.
- **Stage 2 reviews only high-level content** — there's no implementation plan yet, so implementation-focused feedback is irrelevant.
- **Stage 4 reviews everything** — both high-level and detailed plan, checking for consistency.
- The design doc file path is the single thread connecting all stages. Always pass it explicitly.
- If On-Ramp B is used, the user must provide the design doc path. If they don't, ask for it before starting.
