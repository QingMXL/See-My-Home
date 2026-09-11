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

Do not let `quiet-poise` collapse into generic beige contemporary or generic warm minimalism. Every image prompt must combine at least one cue from each of these three identity families, chosen to suit the room rather than added as themed decoration:

1. Spatial order: calibrated negative space, balanced asymmetry, a dark linear datum, or a subtly framed sightline.
2. Material contrast: quiet mineral or honed-stone planes paired with matte dark oak or smoked walnut and tactile neutral textile.
3. Cultural abstraction: one ink-like abstract artwork, paper- or silk-like diffused light, or one handcrafted ceramic vessel with a restrained branch.

Keep these cues sparse. They must read as a contemporary design language, never as literal historical styling.

Never put research sources, architecture-firm names, designer names, or style-transfer attribution in a production image prompt. Describe the observable design language directly.

The immutable/editable scope supplied by the runtime has higher authority than any style rule. Preserve all walls, columns, beams, windows, doors, openings, ceiling geometry, camera position, perspective, source aspect ratio, and crop. Do not hide a structural change behind decoration. A comparison that reports a tighter crop, shifted edge, altered aspect ratio, recentering, or perspective correction is a failed camera check and must not be published.

Avoid traditional Chinese theme décor, literal historical motifs, Japanese room language, generic Japandi, high-saturation red and gold, glossy red wood, monumental hotel-lobby scale, theatrical chandeliers, and excessive material variety.
