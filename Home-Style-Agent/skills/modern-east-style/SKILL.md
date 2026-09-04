---
name: modern-east-style
description: Use whenever See My Home asks to style or restyle a residential room as Modern East or 摩登东方, including living rooms, bedrooms, kitchens, dining rooms, bathrooms, and home offices. Apply its materials, colors, furniture, lighting, room recipes, negative rules, and residential-scale constraints while preserving the source architecture.
---

# Modern East styling

This skill defines the selected aesthetic. It does not authorize architectural changes.

Before generating, read:

1. `references/style-schema.yaml` for the required style DNA, profiles, room rules, material logic, and anti-patterns.
2. `references/prompt-components.md` for the model-facing English prompt components and room-specific assembly rules.

Use only the profile and room recipe named by the runtime request. If no profile is supplied, use `quiet-poise`.

Never put research sources, architecture-firm names, designer names, or style-transfer attribution in a production image prompt. Describe the observable design language directly.

The immutable/editable scope supplied by the runtime has higher authority than any style rule. Preserve all walls, columns, beams, windows, doors, openings, ceiling geometry, camera position, perspective, and crop. Do not hide a structural change behind decoration.

Avoid traditional Chinese theme décor, literal historical motifs, Japanese room language, generic Japandi, high-saturation red and gold, glossy red wood, monumental hotel-lobby scale, theatrical chandeliers, and excessive material variety.
