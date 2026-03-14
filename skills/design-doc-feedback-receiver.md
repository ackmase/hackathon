---
name: design-doc-feedback-receiver
description: Receive feedback on design docs, verify validity against code/docs, make minimal changes to address valid feedback, and surface disagreements or open questions.
---

# Design Doc Feedback Receiver

## Overview
Process feedback on design documents by verifying validity against the codebase and existing documentation, implementing minimal changes to address valid feedback, and surfacing any disagreements or unresolved questions.

## Trigger
Use this skill when:
- User provides feedback on a design document (e.g., "feedback on '/path/to/design-doc.md': ...")
- User asks to address review comments on a design doc
- User pastes feedback items for a design document

## Workflow

### 1. Open Question Resolution Phase
Before processing actionable feedback, handle any **open questions** from the reviewer:
- For each open question that includes a **recommendation**:
  - If the recommendation **clarifies or refines existing content** (e.g., "should X use format A or B?" → pick one), adopt it and convert to actionable feedback.
  - If the recommendation **introduces new scope** (e.g., "should we add a feature flag?" → yes), do NOT auto-adopt. **Reject it as scope expansion** with reasoning. Do not surface it to the user — the reviewer should not have raised it.
- For each open question **without a recommendation** (genuinely ambiguous, requires human judgment), keep it as an open question to surface to the user.
- After this phase, the converted items join the actionable feedback list for the next phase.

**Scope creep gate**: Before converting any open question to actionable feedback, ask: "Does adopting this recommendation increase the doc's surface area (new sections, new concepts, new patterns)?" If yes, reject it.

### 2. Feedback Validation Phase
For each feedback item (including items converted from open questions):
- **Read the design document** to understand the current state
- **Verify against the codebase** (read relevant implementation files, tool signatures, data contracts)
- **Categorize feedback** as:
  - **Valid**: Feedback is accurate and should be addressed
  - **Invalid**: Feedback is based on incorrect assumptions or outdated information
  - **Question**: Feedback requires clarification before action
  - **Scope expansion**: Feedback suggests adding new concepts, features, or patterns not already present in the doc. Reject with reasoning — the doc's scope is set by the author. **When in doubt, reject.** It is better to leave the doc unchanged than to expand its scope.

### 3. Implementation Phase

**Scope guard — check BEFORE editing**: For each valid feedback item, ask: "Will this edit make the doc longer or add new concepts?" If yes, verify the feedback is correcting an inaccuracy or resolving an internal contradiction — not filling a "gap" the author intentionally left. If it's gap-filling, reclassify as scope expansion and reject.

For **valid feedback**:
- Make **minimal changes** to the design document (only what's needed to address the feedback)
- Prefer targeted edits over rewrites
- Preserve existing content unless directly contradicted by valid feedback
- Update only the sections/paragraphs that need changes
- **Net-zero preference**: Edits should ideally not increase the doc's line count. If you add a sentence, see if you can tighten surrounding text to compensate. The goal is refinement, not growth.

For **invalid feedback**:
- Document why it's invalid (with evidence from code/docs)
- Do NOT make changes based on invalid feedback

For **questions**:
- Surface clearly with context for the user to answer

### 4. Output Phase
Return a structured summary with:
1. **Changes Made** - List of edits applied to the design doc
2. **Disagreements / Invalid Feedback** - Items rejected with reasoning
3. **Open Questions** - Items needing clarification before action

## Validation Guidelines

### Verify Against Code
- Read actual implementation files (don't assume)
- Check tool signatures match proposed usage
- Validate data contracts and return shapes
- Confirm architectural patterns align with codebase

### Verify Against Docs
- Check design doc matches current state
- Cross-reference with other design docs if needed
- Validate links and references

### Common Invalid Feedback Patterns
- Requests already implemented in the design doc
- Suggestions based on outdated code understanding
- Requests that conflict with established project constraints
- Overly prescriptive implementation details that already exist
- Suggestions to add feature flags, error contracts, or defensive patterns not already in the doc
- New test proposals for behavior the doc doesn't describe
- Additions that introduce concepts absent from the doc (treat as scope expansion, not a gap)

## Minimal Change Philosophy

**DO**:
- Correct inaccuracies (wrong facts, stale code references)
- Clarify ambiguous statements (reword, not expand)
- Fix internal contradictions between sections

**DON'T**:
- Add new sections, subsections, or content categories
- Rewrite entire sections when a sentence fix suffices
- Add implementation details not requested in feedback
- Change style/formatting unless specifically requested
- Over-engineer solutions to simple feedback items
- Expand a bullet point into a paragraph, or a paragraph into a section
- Add content "for completeness" — the doc is complete as the author scoped it
- **Summarize, condense, or delete implementation code in phased plan sections** (code snippets, SVG paths, CSS values, hex colors, z-index values, DOM structures, exact function signatures, etc.). These represent carefully aligned implementation decisions. Only modify them if they are **incorrect** (don't match the codebase or intended implementation) or **stale** (reference outdated APIs, wrong file paths, nonexistent functions). "Too detailed" is never a valid reason to remove code from a phased plan.

## Output Format

```
## Summary
Processed N feedback items: X valid, Y invalid, Z questions

## Changes Made

### [Feedback Item #1 Description]
**Change**: Added section "X" with details on Y
**Location**: Section 3.2, after "Proposed Design"
**Rationale**: Feedback correctly identified missing edge case handling

### [Feedback Item #2 Description]
**Change**: Updated tool signature in Phase 1 implementation
**Location**: Lines 245-250
**Rationale**: Verified against backend/tools/google_slides_tool.py - signature was outdated

---

## Disagreements / Invalid Feedback

### [Feedback Item #3 Description]
**Status**: Invalid
**Reasoning**: Design doc already includes this in Section 4.1 ("Rollback Strategy"). Verified section exists with required details.
**Evidence**: Lines 1175-1210 contain complete rollback runbook

### [Feedback Item #4 Description]
**Status**: Disagreement
**Reasoning**: Feedback suggests adding async behavior, but current production code uses synchronous calls (verified in backend/tools/data_handler_tool.py:89-120). Changing this would misrepresent actual implementation.
**Evidence**: Code inspection shows no async/await in DataHandlerTool methods

---

## Open Questions Resolved (from reviewer recommendations)

1. **[Open Question #1]**: Should section markers support regex patterns or only exact string matching?
   - **Reviewer recommendation**: Exact string matching (simpler, sufficient for current use cases)
   - **Action**: Adopted recommendation. Updated Section 2.3 to specify exact string matching.

---

## Remaining Open Questions (no recommendation, needs user input)

1. **[Open Question #2]**: What HTTP status code for empty section errors - 400 or 422?
   - Affects error contract in structured error section
   - Current doc uses 422, feedback suggests 400
```

## Example Usage

```
User: "feedback on 'design-docs/feature.md': 1. [P0] Add error handling for edge case X. 2. [P1] Update tool signature to match production. 3. Section 4 already covers rollback."

Skill Response:
## Summary
Processed 3 feedback items: 2 valid, 1 invalid, 0 questions

## Changes Made

### Add error handling for edge case X (P0)
**Change**: Added "Error Handling" subsection in Section 3 with edge case X handling
**Location**: Section 3.4, after "Implementation Details"
**Rationale**: Edge case not previously documented, verified against test suite

### Update tool signature to match production (P1)
**Change**: Updated `generate_deck()` signature to include `slide_range` parameter
**Location**: Lines 498-510
**Rationale**: Verified against backend/tools/google_slides_tool.py:705 - parameter was missing

---

## Disagreements / Invalid Feedback

### Section 4 already covers rollback
**Status**: Invalid
**Reasoning**: Design doc includes comprehensive rollback section with runbook
**Evidence**: Section 4.2 "Rollback Strategy" (lines 1200-1250) contains step-by-step rollback procedures, monitoring queries, and decision criteria
```

## Best Practices

1. **Always read before editing** - Don't assume doc content, verify first
2. **Check twice, edit once** - Validate feedback against code before making changes
3. **Be conservative** - When in doubt, ask rather than guess
4. **Document reasoning** - Explain why feedback is valid/invalid with evidence
5. **Respect priorities** - Address P0 items first, clarify before implementing uncertain items

## Anti-Patterns to Avoid

- Making changes without verifying feedback validity
- Rewriting sections when small edits suffice
- Accepting all feedback uncritically
- Failing to surface disagreements or questions
- Over-engineering simple feedback fixes
- Summarizing or deleting detailed implementation code from phased plans (treat as immutable unless incorrect or stale)
- **Scope creep via accumulation**: Each edit is small, but across 5 iterations the doc grows 30%. Guard against this — if the doc is getting longer each iteration, something is wrong.
- **Treating open questions as action items**: An open question with a recommendation to "add X" is scope expansion, not a clarification. Reject it.
- **Gap-filling**: Adding content the author "should have included." The author's omissions are intentional. Only add content to fix contradictions or inaccuracies.
