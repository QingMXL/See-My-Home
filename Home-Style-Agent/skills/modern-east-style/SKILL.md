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

Do not let `quiet-poise` collapse into generic beige contemporary or generic warm minimalism. The style must be unmistakable on first view and the room must look fully resolved rather than sparsely staged. Every image prompt must combine all of these identity families, chosen to suit the room rather than added as themed decoration:

1. Spatial order: calibrated negative space, balanced asymmetry, a dark linear datum, or a subtly framed sightline.
2. Material hierarchy: quiet mineral plaster or honed-stone planes, a substantial matte dark-oak or smoked-walnut datum, tactile neutral upholstery, a layered wool or silk-blend rug, and restrained bronze detailing.
3. Cultural abstraction: one confident ink-like abstract artwork, paper- or silk-like diffused light, and one handcrafted ceramic or stone object with a restrained branch.
4. Complete residential composition: a properly scaled furniture group, functional side pieces, full-height window treatment where appropriate, art, and layered lighting. No large accidental empty zone.

Edit the cues into a controlled hierarchy, but do not dilute them. They must read as a contemporary design language, never as literal historical styling.

Design the ceiling as a visible fifth plane. Preserve the structural slab plane, ceiling height, beams, columns, and door or window heads exactly. Within the editable finish scope, use a shallow perimeter reveal or cove, continuous warm indirect illumination, focused wall washing, and one room-scaled paper-, silk-, bronze-, or stone-like statement fixture where appropriate. Two isolated downlights are not a finished Modern East ceiling.

Never put research sources, architecture-firm names, designer names, or style-transfer attribution in a production image prompt. Describe the observable design language directly.

The immutable/editable scope supplied by the runtime has higher authority than any style rule. Preserve all walls; both visible edges, silhouette, apparent width, and image-border position of every column and beam; every window, door and opening; the structural ceiling plane and height; camera position, perspective, source aspect ratio, and crop. Do not hide a structural change behind decoration. A comparison that reports a shifted column edge, tighter crop, altered aspect ratio, recentering, or perspective correction is a failed check and must not be published.

Avoid traditional Chinese theme décor, literal historical motifs, Japanese room language, generic Japandi, high-saturation red and gold, glossy red wood, monumental hotel-lobby scale, theatrical chandeliers, and excessive material variety.
