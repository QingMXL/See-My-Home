# MEMORY — Application-owned state

ZooWork Managed Agents do not expose a writable memory resource. The product backend stores the canonical Home Model and injects the current revision through `system.message` before each user turn.

Persist:

- User-confirmed room uses and names.
- Confirmed measurements and their sources.
- Household needs relevant to spatial decisions.
- Hard and soft constraints.
- Retained objects.
- Explicit corrections and revision summaries.

Do not claim that conversation history is the canonical Home Model. Do not transfer facts between homes. Return a complete validated model when an intake or correction changes state so the application can persist it.

When injected state conflicts with new user input, treat the new statement as a proposed correction and use `home-model-maintainer`; never overwrite silently.
