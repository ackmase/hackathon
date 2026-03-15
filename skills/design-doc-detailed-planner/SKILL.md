---
name: design-doc-detailed-planner
description: Take a reviewed high-level design doc and append a phased implementation plan with low-level code details, exact signatures, and concrete tests.
---

# Design Doc Detailed Planner

## Overview
Take a reviewed, clean high-level design doc and append a `## Phased Implementation Plan` section with low-level implementation details. Each phase is self-contained enough for a separate engineer to implement with only the design doc.

## Trigger
Use this skill when:
- User asks to "add a detailed plan", "add implementation phases", or "plan the implementation"
- User has a design doc that has been through the review loop and wants to move to implementation planning

## Workflow

### 1. Read the Design Doc
- Read the full high-level design doc
- Understand goals, non-goals, proposed design, data flow, and constraints
- Do NOT modify any existing high-level sections

### 2. Explore the Codebase
- Read files referenced in the design doc
- Understand existing patterns, file structure, tool signatures, and conventions
- Identify integration points and dependencies
- Note test patterns and mock setups used in existing tests

### 3. Design Phases
- Break the implementation into self-contained phases
- Order phases so earlier phases build foundations for later ones
- Ensure each phase is independently testable
- Always end with a dedicated integration test phase

### 4. Append the Phased Implementation Plan
- Append a `## Phased Implementation Plan` section to the bottom of the existing design doc
- Use the exact structure defined below for each phase
- Include enough detail that an implementer needs zero implicit knowledge

## Phase Structure

Each phase MUST follow this exact structure:

```markdown
### Phase N: <Short descriptive title>

#### Summary
One paragraph describing what this phase accomplishes and why it's a self-contained unit.

#### Prerequisites
- What must exist before this phase starts (e.g., "Phase 1 complete" or "existing file X")

#### Files to Modify
- `path/to/existing_file.py` — what changes and why
- `path/to/new_file.py` (NEW) — justification for new file

#### Implementation Details
Detailed, low-level description of the changes. Include:
- Exact function signatures with parameters and return types
- Data structures / schemas
- Key logic and control flow (pseudocode or real code snippets)
- Integration points with existing code (specific function calls, imports)
- Error handling specifics

#### Tests
- **Unit tests** for this phase only
- Exact test function names and what they verify
- Mock setup (what to mock, what shapes to return)
- Edge cases to cover
- Expected file: `backend/tests/test_<relevant_module>.py` (or new file with justification)

#### Completion Criteria
- [ ] All source code changes implemented
- [ ] All unit tests written and passing
- [ ] No regressions in existing tests
```

## Design Principles for Phases

1. **Self-contained**: Each phase must be implementable by a completely separate engineer who has only read the design doc. No implicit knowledge, no "you'll know what to do" — everything is explicit.

2. **Independently testable**: Each phase has its own unit tests that pass in isolation. Phase 2 tests should pass even if Phase 3 hasn't been implemented yet.

3. **Clear boundaries**: No phase should partially implement a feature. If a feature spans multiple concerns (data model + API + UI), either keep it in one phase or split along clean seams where each phase produces a working (if incomplete) system.

4. **Ordered dependencies**: Phase N can depend on Phase N-1 being complete. Phases should be ordered so that earlier phases build foundations that later phases extend.

5. **Final integration phase**: Always end with a dedicated integration test phase that ties all phases together with end-to-end tests.

6. **No high-level content in phases**: The phased plan is purely low-level implementation details. Objectives, scope, non-goals, alternatives, risks — all of that stays in the existing high-level sections above.

## What the Planner Should NOT Do
- Modify existing high-level sections of the design doc
- Add scope, goals, or architectural discussion to the phased plan
- Create phases that overlap or duplicate work
- Leave any phase vague enough that an implementer would need to "figure it out"
- Create unnecessary new files when logic fits in existing files

## Final Integration Phase

The last phase MUST be an integration test phase:

```markdown
### Phase N: Integration Tests

#### Summary
End-to-end integration tests that verify all phases work together correctly.

#### Tests
- Test functions covering cross-phase interactions
- Full workflow tests (input -> output across all phases)
- Regression tests for existing functionality that may be affected

#### Completion Criteria
- [ ] All integration tests written and passing
- [ ] All unit tests from previous phases still passing
- [ ] Manual smoke test checklist (if applicable)
```
