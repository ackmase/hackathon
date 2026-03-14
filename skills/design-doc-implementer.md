---
name: design-doc-implementer
description: Implement a design doc phase-by-phase in a loop. Each iteration implements one phase, runs tests, marks it complete, clears context, and moves to the next.
---

# Design Doc Implementer

## Overview
Automated phase-by-phase implementation of a design doc's phased implementation plan. Each iteration implements one phase in a clean context window, runs tests until passing, marks completion criteria, and loops until all phases are done.

## Trigger
Use this skill when:
- User says "implement this design doc", "implement design-docs/foo.md", or "run the implementer"
- User wants automated implementation of a phased design doc

## Prerequisite: Phased Implementation Plan Required

**CRITICAL**: Before starting the loop, read the design doc and verify it contains a `## Phased Implementation Plan` section with phases that have completion criteria checkboxes (`- [ ]`).

**If the section is missing or empty**, do NOT proceed. Instead, tell the user:
```
This design doc does not have a "## Phased Implementation Plan" section with completion criteria.
The implementer requires a detailed phased plan to execute. You can add one by running:
  /design-doc-detailed-planner
```
Then stop. Do not attempt to implement anything without a phased plan.

## Loop Workflow

```
┌─────────────────────────────────────────────┐
│  1. Fresh context (sub-agent from prev iter)│
│  2. Read the entire design doc              │
│  3. If all phases complete → EXIT            │
│  4. Identify first incomplete phase         │
│  5. Implement source code for that phase    │
│  6. Implement tests for that phase          │
│  7. Run tests until all pass                │
│  8. Mark phase as completed in design doc   │
│  9. Spawn sub-agent → loops to (2)          │
└─────────────────────────────────────────────┘
```

## Detailed Steps

**CRITICAL — DO NOT STOP MID-ITERATION.** Each iteration has 9 steps implementing one phase. When you finish a step, you MUST immediately proceed to the next step. Completing source code is NOT a stopping point. Tests passing is NOT a stopping point. Marking a phase complete is NOT a stopping point (unless all phases are done). The only valid stopping points are: (a) Step 3 finds all phases complete, (b) Step 4 finds an unmet prerequisite, or (c) Step 7 hits the 3-attempt failure limit. Everything else means CONTINUE.

### Step 1: Fresh Context (via sub-agent)
- From the second iteration onward, this step runs inside a freshly spawned sub-agent (see Step 9), giving it a clean context window containing only the design doc
- On the first iteration, you are already in a clean context — proceed directly
- **Do NOT use `/clear`** — it is a CLI command that has no effect when running autonomously. Sub-agents are the mechanism for fresh context.
- **→ IMMEDIATELY proceed to Step 2.**

### Step 2: Read the Design Doc
- Read the full design doc file from disk
- **Verify the doc contains a `## Phased Implementation Plan` section** — if missing, stop the loop immediately and tell the user to run `/design-doc-detailed-planner` first
- Parse the `## Phased Implementation Plan` section
- Build a list of all phases with their completion status (checked vs unchecked criteria)
- **→ IMMEDIATELY proceed to Step 3.**

### Step 3: Check for Completion
- If every phase has all completion criteria checked off (all `- [x]`), the loop is done
- Print a final summary and exit:
```
--- Implementation Complete ---
All N phases implemented successfully.
```
- **→ If incomplete phases remain, IMMEDIATELY proceed to Step 4. Do not stop.**

### Step 4: Identify First Incomplete Phase
- Find the first phase where any completion criterion is still unchecked (`- [ ]`)
- Read that phase's full details: summary, prerequisites, files to modify, implementation details, tests, completion criteria
- Verify prerequisites are met (earlier phases marked complete)
- If prerequisites are NOT met, surface the issue to the user and stop
- **→ If prerequisites met, IMMEDIATELY proceed to Step 5.**

### Step 5: Implement Source Code
- Follow the phase's implementation details exactly
- Modify the files listed in "Files to Modify"
- Use the exact function signatures, data structures, and logic described
- When the phase says to create a new file, create it
- When the phase says to modify an existing file, read it first, then make targeted edits
- If something in the plan doesn't match the current codebase (e.g., a file has changed since planning), adapt minimally and note the deviation
- Do NOT add features, refactoring, or improvements not described in the phase
- **→ IMMEDIATELY proceed to Step 6. Do not stop after writing source code.**

### Step 6: Implement Tests
- Write the unit tests described in the phase's "Tests" section
- Follow the exact test function names and mock setups described
- Add tests to the files specified in the phase
- **→ IMMEDIATELY proceed to Step 7. Do not stop after writing tests.**

### Step 7: Run Tests Until Passing
- Run the phase's specific tests: `python3 -m pytest <test_file>::<test_class_or_function> -v`
- If tests fail, diagnose and fix the issue in the source code or tests
- Re-run until all tests pass
- Also run the broader test suite to check for regressions: `python3 -m pytest backend/tests/ -v`
- If broader tests fail due to this phase's changes, fix the regression before proceeding
- **3-attempt limit**: If tests for a phase fail after 3 fix attempts, pause the loop and surface the issue to the user with:
  - Which phase
  - Which tests are failing
  - What was tried
  - The error output
- **→ If tests pass, IMMEDIATELY proceed to Step 8. Do not stop after tests pass.**

### Step 8: Mark Phase as Completed
- In the design doc file, check off all completion criteria for this phase: `- [ ]` → `- [x]`
- This creates a persistent record of progress that survives context clears
- Print a status line:
```
--- Phase N complete: <phase title> ---
Continuing to next phase...
```
- **→ IMMEDIATELY proceed to Step 9. Completing a phase is NOT a stopping point.**

### Step 9: Spawn Fresh Sub-Agent for Next Phase
- Use the **Agent tool** to spawn a new sub-agent for the next iteration. This gives the next phase a completely fresh context window, preventing context bloat and stale references from previous phases.
- The sub-agent prompt must include:
  1. The design doc file path
  2. Instruction to run `/design-doc-implementer` starting from Step 2 (read the design doc)
  3. Instruction to report back the final result (either "all phases complete", "phase N complete, spawning next", or "stuck on phase N with error details")
- The sub-agent will execute one full phase (Steps 2-8) and either spawn its own sub-agent for the next phase (Step 9) or terminate if all phases are complete or it gets stuck.
- **Do NOT use `/clear`** — it is a CLI command that has no effect when running autonomously. Sub-agents are the mechanism for fresh context.
- **→ Do not stop here. Spawn the sub-agent NOW.**

## Loop Termination Conditions

1. **No phased plan**: Design doc lacks a `## Phased Implementation Plan` section — stop immediately and direct user to `/design-doc-detailed-planner`
2. **All phases complete**: Every completion criterion across all phases is checked off
3. **Stuck on a phase**: Tests fail after 3 fix attempts — pause and surface to user
4. **Prerequisite not met**: A phase depends on an incomplete earlier phase — surface to user

## What the Implementer Should NOT Do
- Modify high-level design doc sections (Summary, Goals, etc.)
- Skip phases or implement them out of order
- Implement multiple phases in a single iteration (one phase per context window)
- Add features, refactoring, or improvements not described in the phase
- Proceed past a failing phase without user intervention
- Auto-commit after phases (user decides when and how to commit)
- Bump version mid-implementation (single version bump at end if needed)

## Common Failure Modes — AVOID THESE

### Failure: Stopping after implementing source code
**Symptom**: You write all the source code for a phase and then stop — treating the implementation as a deliverable to present to the user.
**Why it happens**: Writing source code feels like the "main work" of a phase. The natural instinct is to present it and wait for approval.
**Fix**: Source code is step 5 of 9. After writing code, immediately write tests (Step 6), run them (Step 7), mark the phase complete (Step 8), and loop back (Step 9). Never present code and stop.

### Failure: Stopping after tests pass
**Symptom**: Tests pass and you report success — but don't mark the phase complete or loop to the next phase.
**Why it happens**: Tests passing feels like a natural completion signal.
**Fix**: Tests passing means proceed to Step 8 (mark complete) then Step 9 (loop). The loop isn't done until ALL phases are complete.

### Failure: Stopping after marking one phase complete
**Symptom**: You mark Phase N complete and print the status line, then stop instead of continuing to Phase N+1.
**Why it happens**: The "Phase N complete" status line feels like a final output.
**Fix**: The status line is informational. After printing it, immediately go to Step 9 → Step 1 → read doc → find next incomplete phase → implement it. Only stop when Step 3 finds all phases complete.

### Failure: Using `/clear` instead of spawning a sub-agent
**Symptom**: Context accumulates across phases despite `/clear` calls, causing stale references, confusion about which files are modified, and degraded implementation quality.
**Why it happens**: `/clear` is a CLI command that only works in the interactive terminal. It has no effect when running autonomously.
**Fix**: Always spawn a new sub-agent (via the Agent tool) at Step 9. This is the only way to get a truly fresh context window between phases.

## Phase Completion Marking Format

Before:
```markdown
#### Completion Criteria
- [ ] All source code changes implemented
- [ ] All unit tests written and passing
- [ ] No regressions in existing tests
```

After:
```markdown
#### Completion Criteria
- [x] All source code changes implemented
- [x] All unit tests written and passing
- [x] No regressions in existing tests
```
