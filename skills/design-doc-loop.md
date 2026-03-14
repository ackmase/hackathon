---
name: design-doc-loop
description: Iteratively review and refine a design doc until all feedback is addressed. Runs /design-doc-reviewer, feeds feedback to /design-doc-feedback-receiver, clears context, and repeats until clean. Supports two on-ramps - start from review or start from user-provided feedback.
---

# Design Doc Loop

## Overview
Automated review-refine loop for design documents. Each iteration reviews the doc, addresses feedback, and repeats until the reviewer finds no remaining issues.

## Trigger
Use this skill when:
- User wants to polish a design doc to completion
- User says "loop on this design doc" or "iterate until clean"
- User wants automated review-feedback cycles without manual intervention
- User provides a block of feedback and says "loop on this feedback"

## On-Ramps

This skill supports two entry points:

### On-Ramp A: Start from Review (default)
- Trigger: User says "loop on this design doc", "iterate until clean", or specifies a design doc without providing feedback.
- Entry point: **Step 1 (Review)** — the loop begins by running `/design-doc-reviewer` to generate feedback.

### On-Ramp B: Start from User-Provided Feedback
- Trigger: User provides a block of feedback and says "loop on this feedback", "address this feedback and loop", or similar.
- Entry point: **Step 3 (Address feedback)** — skip the initial review and go straight to `/design-doc-feedback-receiver` with the user's feedback. After addressing it, continue the normal loop (clear context → review → address → repeat).

## Execution Model — READ THIS FIRST

**The Skill tool is deceptive.** When you invoke `/design-doc-reviewer` or `/design-doc-feedback-receiver` via the Skill tool, the sub-skill returns a well-formatted output block that looks like a complete response to the user. **It is NOT.** That output is an intermediate result — input to the next step of the loop. You must treat Skill tool returns the same way you treat a Grep or Read result: consume it and keep working.

**After EVERY Skill tool call returns, ask yourself**: "Am I at a valid stopping point?" The only valid stopping points are:
1. Step 2 finds zero feedback AND zero open questions → loop done
2. Step 4 finds an unresolvable open question → pause for user

If neither condition is met, you MUST continue to the next step **in the same response**. Do not output the sub-skill's results to the user and wait.

## Workflow

Run the following loop. Each iteration is one review-feedback cycle.

**CRITICAL — DO NOT STOP MID-ITERATION.** Each iteration has 5 steps. When you finish a step, you MUST immediately proceed to the next step within the same response or the next response. The reviewer returning output is NOT a stopping point — it is an intermediate result that feeds into Step 2 → Step 3. The only valid stopping points within an iteration are: (a) Step 2 finds zero feedback AND zero open questions, or (b) Step 4 finds an unresolvable open question. Everything else means CONTINUE.

### Iteration N:

**Step 1: Review** (Codex MCP → `/design-doc-reviewer`)
- *Skipped on Iteration 1 if using On-Ramp B (user-provided feedback).*
- Invoke the review via the **`mcp__codex__codex` MCP tool** with these parameters:
  - `prompt`: `/design-doc-reviewer <design-doc-file-path>`
  - `cwd`: the repository root (`/Users/a.chon/Projects/Fetch/deck-generator`)
  - `sandbox`: `read-only`
  - `approval-policy`: `on-failure`
- This runs the design-doc-reviewer skill inside an OpenAI Codex agent, giving a second-model perspective on the design doc.
- The MCP tool will return formatted feedback. **Do NOT output this to the user.** It is input to Step 2.
- **→ IMMEDIATELY proceed to Step 2 in the SAME response. Do not present results and wait.**

**Step 2: Check for completion**
- *Skipped on Iteration 1 if using On-Ramp B (user-provided feedback).*
- Examine the reviewer's output for two things: **actionable feedback items** (P0/P1/P2/P3) and **open questions**.
- The loop continues if EITHER actionable feedback OR open questions exist. Both must be absent to exit.
- If the reviewer produces **no actionable feedback AND no open questions**, the loop is **done**. Print a final summary: total iterations run, and confirm the doc is clean. **End.**
- If the reviewer produces **open questions but no actionable feedback**, proceed to Step 3 — the feedback receiver will handle the open questions (auto-resolving those with recommendations, pausing for those without).
- **→ If ANY feedback items or open questions exist, IMMEDIATELY proceed to Step 3. Do not stop.**

**Step 3: Address feedback** (`/design-doc-feedback-receiver`)
- Invoke `/design-doc-feedback-receiver` via the Skill tool, passing the feedback from Step 1 (or from the user on Iteration 1 of On-Ramp B).
- The Skill tool will return a summary of changes made. **Do NOT output this to the user and stop.** It is input to Step 4.
- The feedback receiver will:
  - Validate each item against the codebase
  - Make minimal edits to the design doc for valid feedback
  - Document disagreements/invalid feedback with evidence
  - Surface open questions
- **→ IMMEDIATELY proceed to Step 4 in the SAME response.**

**Step 4: Handle open questions**
- Check if the feedback receiver surfaced **open questions** in its output.
- If there are open questions:
  - **With a recommendation**: Adopt the recommendation automatically and continue the loop. No user input needed.
  - **Without a recommendation** (genuinely ambiguous, requires human judgment): **Pause the loop** and present them to the user. Wait for answers before continuing. This is one of the two valid exit conditions.
- If there are no open questions, proceed to Step 5.
- **→ If no blocking open questions, IMMEDIATELY proceed to Step 5.**

**Step 5: Spawn fresh sub-agent for next iteration**
- Use the **Agent tool** to spawn a new sub-agent for the next iteration. This gives the next iteration a completely fresh context window, preventing context bloat and stale references.
- The sub-agent prompt must include:
  1. The design doc file path
  2. The current iteration number (N+1)
  3. Instruction to run `/design-doc-loop` starting from Step 1
  4. Instruction to report back the final result (either "clean review" or "open question needing user input")
- The sub-agent will execute one full iteration (Steps 1-4) and either spawn its own sub-agent for the next iteration (Step 5) or terminate if the loop exit conditions are met.
- **Do NOT use `/clear`** — it is a CLI command that has no effect when running autonomously. Sub-agents are the mechanism for fresh context.

## Loop Termination Conditions

The loop exits ONLY under these conditions:

1. **Clean review**: The reviewer produces **no actionable feedback items AND no open questions**. Both must be absent. If there are open questions but no feedback items, the loop must continue to Step 3 to process them.
2. **Unresolvable open question**: The feedback receiver surfaces an open question **without a recommendation** (genuinely ambiguous, requires human judgment). Pause the loop and present to the user.

**Safety valve** (not a normal exit): After **5 iterations**, stop and present remaining feedback to the user. This prevents infinite loops from subjective or ambiguous feedback.

3. **Scope drift detected**: If the reviewer raises feedback items in iteration N that address concepts/sections that did NOT exist in the original doc (i.e., content introduced by the feedback receiver in a prior iteration), this is scope drift. The feedback receiver should reject such items as scope expansion, but if the loop keeps cycling on new content, stop and report scope drift to the user.

**IMPORTANT — these are NOT valid reasons to exit the loop:**
- Reviewer has open questions (those must be processed through the feedback receiver first)
- Reviewer has only low-priority feedback (P2/P3 items still need to be addressed)
- Feedback receiver disagreed with some items (disagreements are fine, but the loop continues to verify the reviewer is satisfied)
- Open questions that have a recommendation (auto-adopt and continue)

## Output Format

After each iteration, print a brief status line:

```
--- Iteration N complete ---
Feedback items: X total (Y addressed, Z invalid/disagreed, W open questions)
Continuing to next iteration...
```

On loop completion:

```
--- Design Doc Loop Complete ---
Total iterations: N
Final status: [Clean / Stable / Max iterations]
Remaining items (if any): [list]
```

## Common Failure Modes — AVOID THESE

### Failure: Stopping after the reviewer returns (MOST COMMON)
**Symptom**: The reviewer produces feedback items, you print them, and then stop — treating the reviewer's output as a final response. The user sees the feedback but nothing was addressed.
**Why it happens**: The `mcp__codex__codex` tool returns a well-formatted block with "Actionable Feedback" and "Open Questions" headers. It looks like a complete, presentable response. The natural instinct is to show it to the user and wait. **This is the #1 failure mode of this skill — it has happened repeatedly.**
**Fix**: The reviewer's output is INPUT to Step 2/Step 3, not a final deliverable. After the MCP tool returns, do NOT output the feedback to the user. Instead, immediately check for completion (Step 2) and if feedback exists, immediately invoke `/design-doc-feedback-receiver` (Step 3) **in the same response**. The user should never see raw reviewer output — they should only see the iteration status line after all 5 steps complete.

### Failure: Stopping after the feedback receiver returns
**Symptom**: The feedback receiver addresses feedback and returns a summary, you print it, and then stop — without spawning a sub-agent for the next iteration.
**Why it happens**: Same root cause as above. The Skill tool returns a well-formatted summary that feels like a complete response.
**Fix**: After `/design-doc-feedback-receiver` returns, immediately proceed to Step 4 (open questions check) → Step 5 (spawn sub-agent). The iteration is not complete until all 5 steps have run.

### Failure: Stopping because feedback is "only P2/P3"
**Symptom**: The reviewer finds only low-priority items and you decide the doc is "good enough."
**Fix**: ALL priority levels (P0-P3) are actionable. The loop exits ONLY when the reviewer produces zero items.

### Failure: Scope creep across iterations
**Symptom**: Each iteration the doc gets longer. The reviewer flags issues in content the feedback receiver added in the previous iteration. The loop never converges because each fix introduces new surface area to review.
**Why it happens**: The reviewer suggests "improvements" that expand scope. The feedback receiver implements them. The reviewer then finds issues in the new content. Repeat forever.
**Fix**: Both skills have scope constraints. If you notice the reviewer flagging content that was added in a prior iteration (not present in the original doc), that's scope drift. The feedback receiver should reject such feedback as scope expansion. If the loop isn't converging after 3 iterations, check whether the doc is growing — if so, the feedback receiver is accepting scope-expanding feedback it should be rejecting.

### Failure: Using `/clear` instead of spawning a sub-agent
**Symptom**: Context accumulates despite `/clear` calls, review quality degrades, loop produces inconsistent feedback.
**Why it happens**: `/clear` is a CLI command that only works in the interactive terminal. It has no effect when running autonomously.
**Fix**: Always spawn a new sub-agent (via the Agent tool) at Step 5. This is the only way to get a truly fresh context window.

## Important Notes

- **Dual-model review**: Step 1 uses OpenAI Codex (via `mcp__codex__codex`) for the review, while Step 3 uses Claude (via `/design-doc-feedback-receiver` Skill tool) for addressing feedback. This gives a second-model perspective on the design doc and avoids self-review bias.
- The sub-agent spawn between iterations is critical — without it, context accumulates and degrades review quality. (`/clear` is a CLI command that does not work when running autonomously.)
- Each iteration starts fresh in a new sub-agent with only the design doc file as input (no stale conversation context).
- The reviewer may find NEW issues introduced by feedback-receiver edits. This is expected and handled by the loop.
- Disagreements from the feedback receiver are final within a single iteration — they are not re-reviewed. If the reviewer flags the same area again in a subsequent iteration, it will be re-evaluated with fresh context.
