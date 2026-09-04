---
name: material-stylizer
description: Create an optional material or conceptual style image from a validated source-locked plan using ZooWork's injected image generation capability. Use only when the user explicitly requests a style concept; never use the generated image as structural truth and never request a provider API key.
---

# Material Stylizer

This is an optional presentation layer, not the base layout renderer.

Read [the styling boundary](references/styling-boundary.md).

1. Start from the validated source-locked plan.
2. Preserve every confirmed room function and architectural boundary.
3. Request no room-label text; the UI supplies localized labels.
4. Call ZooWork's injected image-generation capability without `model` or `provider` overrides.
5. Use only the approved ZooWork Banana Pro or Image 2 route and never ask for a separate provider key.
6. Mark the output conceptual and keep the deterministic plan available beside it.
7. If geometry drifts, withhold the concept image rather than replacing the locked plan.
