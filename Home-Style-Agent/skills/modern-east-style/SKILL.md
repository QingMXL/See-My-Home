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

Do not let `quiet-poise` collapse into generic beige contemporary or generic warm minimalism. Target a clearly furnished 50–65% visual density: calm, but never empty. The style must be unmistakable on first view and the room must look fully resolved rather than sparsely staged. Every image prompt must combine all of these identity families, chosen to suit the room rather than added as themed decoration:

1. Spatial order: calibrated negative space, balanced asymmetry, a dark linear datum, or a subtly framed sightline.
2. Designed surfaces: quiet mineral plaster, woven silk- or linen-like wallcovering, a shallow upholstered or subtly patterned textile panel, matte dark timber, or one honed-stone plane. Resolve at least one major wall surface whenever finishes are editable.
3. Furniture lineage: at least one contemporary Ming-derived silhouette—such as an abstracted yoke-back or horseshoe-back lounge chair, a restrained joinery stool or bench, or a bridged-frame side table—paired with comfortable contemporary seating. Never use a replica dynasty furniture set.
4. Material hierarchy: a substantial matte dark-oak or smoked-walnut datum, pale honed limestone or quiet-veined marble, tactile linen, bouclé or nubby wool, a silk-blend rug, and restrained bronze. A tea-smoked acrylic, cast-resin, lacquer, or colored-glass accent may add contemporary tension without reading as plastic.
5. Cultural abstraction: confident ink-wash abstraction or quiet landscape-like mark making, a contemporary paper- or silk-diffused light, and one celadon, smoky-glazed, black-stoneware, or carved-stone vessel with a restrained branch. Do not reduce the style to a single Chinese-looking picture.
6. Complete residential composition: a properly scaled furniture group, functional side pieces, full-height window treatment where appropriate, art, collectable objects, and layered lighting. No large accidental empty zone.

Edit the cues into a controlled hierarchy, but do not dilute them. They must read as a contemporary design language, never as literal historical styling.

Design the ceiling as a visible fifth plane. Preserve the structural slab plane, ceiling height, beams, columns, and door or window heads exactly. Within the editable finish scope, use a shallow plaster or timber-lined perimeter reveal, slim bronze or dark-timber datum, continuous 2700–3000K indirect illumination, focused wall washing, and one room-scaled contemporary lantern-like fixture in paper, silk, bronze, alabaster, or stone where appropriate. Existing construction downlights may be removed, reduced, or integrated into the new lighting logic. A blank white ceiling or two isolated downlights is not a finished Modern East ceiling.

Never put research sources, architecture-firm names, designer names, or style-transfer attribution in a production image prompt. Describe the observable design language directly.

The immutable/editable scope supplied by the runtime has higher authority than any style rule. Preserve all walls; both visible edges, silhouette, apparent width, and image-border position of every column and beam; every window, door and opening; the structural ceiling plane and height; camera position, perspective, source aspect ratio, and crop. Do not hide a structural change behind decoration. A comparison that reports a shifted column edge, tighter crop, altered aspect ratio, recentering, or perspective correction is a failed check and must not be published.

Avoid traditional Chinese theme décor, literal historical motifs, blue-and-white porcelain collections, Japanese room language, generic Japandi, high-saturation red and gold, glossy red wood, monumental hotel-lobby scale, theatrical chandeliers, cheap plastic-looking acrylic, and excessive material variety. Modern East must be carried by the furniture lineage, designed surfaces, material contrast, light, and collected objects together—not by a lone scroll or vase.
