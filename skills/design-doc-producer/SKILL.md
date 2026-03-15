---
name: design-doc-producer
description: Produce high-level design docs for this repo, grounded in the slide_deck_agent ecosystem, with alternatives and a recommended option.
---

# Design Doc Producer

## Overview
Create high-level design docs for this repo. Keep designs grounded in the slide_deck_agent ecosystem and always include an Alternatives Considered section with a recommended option.

## Trigger
Use this skill when the user asks to create, draft, or update a design doc.

## Workflow
1. Extract constraints from the user prompt.
   - Goal, audience, scope, success criteria.
   - Non-goals and out-of-scope items.
   - Deployment or rollout expectations.
2. Ground the design in the slide_deck_agent ecosystem.
   - Prefer local sources first: `slide_deck_agent.py`, `slide_deck_agent_with_evaluator.py`, `backend/`, `frontend/`, `backend/instructions.py`.
   - If available, verify against canonical repo: `https://github.com/fetch-rewards/slide_deck_agent`.
3. Keep the design high level.
   - Focus on architecture, data flow, components, interfaces, and key decisions.
   - Avoid implementation details (exact class names, full signatures, step-by-step code) unless explicitly requested.
4. Create or update a `.md` file in `design-docs/`.
5. Always include Alternatives Considered with at least 2 options and a clear recommendation.
6. Include explicit risks and open questions when needed.
   - For each open question, provide a recommended solution if you have one. Explicitly state "No recommendation" if you don't.

## Required Sections
- Title
- Summary
- Goals
- Non-Goals
- Proposed Design
- Data Flow / Interfaces
- Alternatives Considered (include recommended option)
- Risks / Edge Cases
- Testing & Validation
- Rollout / Monitoring
- Open Questions (optional, only if needed)

## Output Template
Use this as the baseline structure:

```
# <Title>

## Summary
<1–3 paragraphs>

## Goals
- ...

## Non-Goals
- ...

## Proposed Design
- <High-level architecture and components>

## Data Flow / Interfaces
- <Key inputs, outputs, and system boundaries>

## Alternatives Considered
1. <Option A> (Recommended)
   - Pros:
   - Cons:
2. <Option B>
   - Pros:
   - Cons:

## Risks / Edge Cases
- ...

## Testing & Validation
- ...

## Rollout / Monitoring
- ...

## Open Questions (if needed)
- <Question>
  - **Recommendation**: <Recommended solution, or "No recommendation" if none>
- ...
```
