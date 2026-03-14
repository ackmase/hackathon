---
name: design-doc-reviewer
description: Review design docs with concrete, prioritized, copy/pastable feedback and open questions, then return updated feedback after answers.
---

# Design Doc Reviewer

## Overview
Review design docs for this repo and return actionable, prioritized, copy/pastable feedback.
Assume a teammate may have included very detailed low-level implementation and unit test sections, including code snippets/pseudocode.
This low-level detail is intentional and desirable when it is encapsulated in a clearly labeled dedicated section (for example, "Implementation Plan" or "Test Plan"), rather than scattered across high-level sections.
The reviewer must validate those details against the actual codebase and call out mismatches, weak direction, inefficiencies, and low-value comments.

## Scope Constraint — READ THIS FIRST

Your job is to improve what's IN the doc, not to expand its scope. The doc represents deliberate authorial decisions — if something is absent, assume the author excluded it intentionally unless the omission creates an internal contradiction.

**Valid feedback** (address what's there):
- Contradictions between sections
- Code snippets that don't match the actual codebase
- Missing error handling for flows the doc already describes
- Incomplete test coverage for features the doc already proposes
- Unclear or ambiguous descriptions of existing content

**Invalid feedback** (adds new scope):
- Suggesting feature flags, rollout gates, or kill switches not already in the doc
- Proposing new error contracts, prefixing schemes, or observability additions beyond what's described
- Adding defensive patterns (aggregation, deduplication, retry logic) for edge cases the doc doesn't mention
- Recommending new tests for behavior the doc doesn't propose
- Suggesting new sections, subsections, or content categories not present in the doc
- "What about X?" suggestions disguised as open questions with recommendations
- Proposing abstractions, helpers, or utilities the doc doesn't already define
- Suggesting the doc "should also cover" or "would benefit from" something not already there
- Recommending restructuring that increases the doc's surface area (splitting sections, adding new headings)

**When in doubt**: If implementing the feedback would introduce a concept/feature/pattern not already present in the doc, it is scope expansion. Do NOT include it — not as actionable feedback, not as an open question. The doc's scope is set. Only raise an open question if there is a genuine **internal contradiction** that cannot be resolved without the author's input.

**Open Questions are NOT a loophole.** Open questions exist for genuine ambiguity within the doc's existing scope (e.g., "Section 3 says X but Section 5 says Y — which is correct?"). They are NOT for suggesting additions, improvements, or "what about X?" expansions. If you catch yourself writing an open question that recommends adding something new to the doc, delete it — that's scope expansion wearing a question mark.

## Trigger
Use this skill when the user asks to review a design doc, critique a design, or provide doc feedback.

## Workflow
1. Re-read the doc carefully and identify gaps in:
   - Clarity
   - Scope and non-goals
   - Risks and edge cases
   - Validation/testing plan
   - Rollout/monitoring and rollback
   - **File count justification** (see step 2a)
2. If the doc contains low-level implementation or unit test details (including code), verify those details against the actual repository implementation.
   - Treat low-level detail as expected and desirable when it is contained in its own dedicated section.
   - Do not recommend removing low-level detail solely because it is detailed; flag organization issues only when low-level content is scattered through high-level sections.
   - Flag places where proposed or documented code does not match real code paths, tool signatures, data contracts, or architecture.
   - Flag inefficient or over-complicated approaches when a simpler/correct pattern already exists in repo.
   - Flag implementation direction that conflicts with established project conventions or known constraints.
   - Flag code comments in proposed snippets that are not useful (obvious narration, stale/misleading comments, or noise).
2a. **Check net new file count justification.** Count every net new file the design proposes (source files, test files, config files, etc.). For each new file, ask whether it is justified:
   - Could the logic live in an existing file instead of creating a new one?
   - Are multiple small new files better consolidated into fewer files with clear logical grouping (e.g., one source file + one test file instead of three of each)?
   - Are test files co-located or grouped logically with the code they test?
   If the file count looks inflated, add a feedback item suggesting consolidation with a concrete proposal (which files to merge, where to add code instead).
3. Produce copy/pastable actionable feedback.
4. List open questions separately.
5. After the user answers, incorporate those answers and return updated actionable feedback in one copy/paste block.

## Output Format
Return two sections in order:
1. **Actionable Feedback** (copy/paste block)
2. **Open Questions** (if any)

When answers arrive, return:
- **Actionable Feedback (Updated)** with open questions resolved inline.

## Actionable Feedback Guidelines
- Use short, concrete items.
- Each item should be directly implementable in the design doc.
- Include priority when appropriate (`P0`, `P1`, `P2`, `P3`).
- **Never suggest additions that introduce new concepts not already in the doc.** Not as feedback, not as open questions. The doc's scope is final.
- **Treat author omissions as intentional.** If the doc doesn't have a feature flag, that's a decision. If it doesn't have error prefixes, that's a decision. Only flag omissions that create internal contradictions.
- **Prefer the shortest path.** When proposing a fix, choose the minimal change that resolves the issue. Do not suggest restructuring, adding subsections, or introducing abstractions when a one-line clarification suffices.
- **Do not compound.** Each feedback item must stand on its own. Do not give feedback that only makes sense if another feedback item is also adopted (e.g., "add X" then "now that X exists, also add Y").

## Phased Implementation Plan Review

When a design doc contains a `## Phased Implementation Plan` section, apply these additional review dimensions:

### Phase Quality Checks
- **Self-containment**: Can each phase be implemented by a separate engineer with only the design doc? Flag phases that reference implicit knowledge, use vague language ("handle this appropriately"), or skip implementation details.
- **Phase boundaries**: Are phases cleanly separated? Flag phases that partially implement features or that require another phase to be useful.
- **Dependency ordering**: Are phases ordered correctly? Flag cases where Phase N depends on something introduced in Phase N+2.
- **Test coverage**: Does each phase have concrete unit tests? Flag phases with vague test plans ("add tests for X") instead of specific test functions.
- **Integration test phase**: Does the final phase cover cross-phase interactions? Flag if integration tests only test individual phases rather than end-to-end flows.
- **Code accuracy**: Do proposed code snippets, function signatures, and file paths match the actual codebase? (Verify against real code.)

### Priority Guidelines for Phased Plans
- **P0**: Phase is not self-contained (would block an independent implementer)
- **P0**: Phase has no tests or tests don't cover the phase's changes
- **P1**: Phase boundary is unclear (overlaps with another phase)
- **P1**: Code snippets reference nonexistent functions/files/signatures
- **P2**: Phase could be split or merged for cleaner boundaries
- **P2**: Test plan is incomplete (missing edge cases, no mock setup)
- **P3**: Minor improvements to phase descriptions or ordering

### What NOT to Flag in Phased Plans
- **Do not flag low-level detail as a problem.** Detailed code snippets, exact function signatures, specific test names, SVG paths, CSS values, hex colors, z-index values, DOM structures, and other verbatim implementation specs are expected and desirable in the phased plan.
- **Do not suggest summarizing, condensing, or removing implementation code.** These details represent carefully aligned implementation decisions. Only flag them if they are **incorrect** (don't match the codebase or intended implementation) or **stale** (reference outdated APIs, wrong file paths, nonexistent functions). "Too detailed" or "could be shorter" is never valid feedback for phased plan code.
- **Do not suggest moving phase content to high-level sections** or vice versa. The separation between high-level design and low-level phased plan is intentional.

## Example Feedback Block
```
Actionable Feedback
1. [P1] Add a brief data flow bullet list in Proposed Design to clarify how data moves from Mission Control to deck generation.
2. [P2] In Testing & Validation, add at least one negative test case (invalid campaign ID) and expected behavior.
3. [P1] Design proposes 4 new files (foo_helper.py, foo_utils.py, test_foo_helper.py, test_foo_utils.py). Consolidate into 2: add helper/util logic to existing foo_tool.py and tests to test_foo_tool.py — the new functions are small and logically belong there.
4. [P3] Call out metrics that need backfill or migration in Rollout / Monitoring.
```
