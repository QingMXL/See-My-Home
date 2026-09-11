# Maximal Luxe Prompt Library v0.1

Production prompts are English-only. Names of designers, studios, publications, television series, and fictional characters must never be compiled into a production prompt.

## 1. Input variables

```text
{room_type}
{profile}: edited-glamour | eighties-socialite | regency-modern | collector-color
{renovation_level}: furnish | refresh | light-remodel
{editable_scope}
{immutable_observations}
{room_size_band}
{style_intensity}
```

## 2. Universal positive base

```text
Edit the supplied interior photograph into an unmistakable Maximal Luxe residence: bold, collected and glamorous, yet carefully edited and fully livable. Reach a controlled 60–75% visual density and build one clear dramatic focal point using saturated color, sculptural comfortable furniture, layered art, controlled pattern, rich tactile textiles, expressive material contrast and a few jewel-like reflective accents. Create hierarchy rather than clutter: one dominant field color, one supporting jewel tone, a neutral breathing color, one coherent metal finish, and no more than two pattern families at clearly different scales. Treat the ceiling as a major design layer with a shallow applied perimeter cove or graphic reveal, one room-scaled statement fixture, warm picture or wall lighting, and controlled accent pools, without changing the structural slab plane, beams, columns, room height, or opening heads. Keep circulation, ergonomics and residential comfort believable.
```

## 3. Mandatory source-preservation block

```text
This is a controlled image edit, not a scene replacement. Preserve the source image's exact aspect ratio, crop, framing, camera position, camera height, focal-length feel, vanishing points, and perspective. Preserve the exact room envelope and every visible wall, column, beam, ceiling plane, door, window, recess and opening. Keep the exact count, dimensions, position and panel divisions of all doors and windows. Do not recenter, straighten, widen, crop, zoom, rotate or invent architecture. Apply decorative richness only to the approved finishes, furnishings, lighting, art and decor within {editable_scope}. Maintain realistic residential scale, clearances and circulation.
```

This block communicates intent only. The Agent must also enforce the same constraints using masks, conditioning, generation settings, and post-generation validation.

## 4. Profile fragments

### `edited-glamour`｜default

```text
Use a cream, warm taupe or soft-black foundation with one controlled field of aubergine, plum, emerald, teal or oxblood. Add a sculptural curved seating piece, tactile velvet or mohair, dark timber or one expressive stone, satin brass, one statement light and confident contemporary art. Preserve at least one calm surface in every view.
```

### `eighties-socialite`

```text
Create an edited 1980s socialite mood through deep aubergine or plum, polished brass used sparingly, smoked glass, a limited antiqued-mirror accent, tailored curves and assertive art. Keep the result contemporary and residential. Do not generate personal portraits, costume-drama props, a full period replica, a ballroom, a nightclub or a mirror ceiling.
```

### `regency-modern`

```text
Use cream, soft black, lacquer, satin brass, sculptural curves, one black-and-white graphic note and jewel-like lighting. Balance vintage glamour with clean contemporary silhouettes. Avoid ornate palace moldings, Rococo furniture, excessive gilding and literal Old Hollywood theming.
```

### `collector-color`

```text
Let art and collected vintage-inspired pieces lead the room. Use a strong but coherent wall color, dark wood, tactile upholstery, a restrained metal accent and carefully grouped objects. Make the room feel accumulated over time, not merchandised as a matching set.
```

## 5. Room fragments

### Living room

```text
Create one strong conversation group with a curved or sharply tailored sofa, one or two statement chairs, a practical sculptural coffee table and a correctly sized rug. Choose only one principal pattern surface: rug, drapery or wallpaper. Add one large artwork or one edited gallery grouping, not both at maximum intensity. Keep all routes and openings clear and preserve a calm visual plane.
```

### Primary bedroom

```text
Create a cocooning but restful bedroom with one saturated envelope color or one patterned wall, a sculptural upholstered headboard, rich solid-color bedding, tactile drapery and warm jewel-like bedside lighting. If the wall is patterned, keep the rug and bedding quieter. Avoid hotel-suite staging, palace furniture and overstuffed decoration.
```

### Kitchen and dining

```text
Keep all existing appliance, plumbing and service locations. In the kitchen, express the style through one or two controlled moves such as lacquered cabinet fronts, one expressive stone, or a coherent brass hardware family. In the dining area, use a sculptural table, comfortable upholstered chairs, one statement chandelier and confident art at residential scale. Do not create a bar, nightclub booth, oversized wine wall or fantasy mansion island.
```

### Bathroom

```text
Keep all fixture and wet-zone locations. For a full bath, choose one expressive stone or one deep vanity color, then add a sculptural mirror and warm face-level lighting. For a powder room, a single graphic wallpaper or lacquered color envelope may be used at higher intensity. Avoid mirrored ceilings, crystal overload, palace bathtubs and impossible wet rooms.
```

## 6. Raw-shell completion fragment

```text
Complete the unfinished room without changing its visible geometry. Treat all existing walls, slab edges, beams, columns, structural ceiling plane, door openings and window openings as immutable. First add plausible residential finishes, a shallow non-structural ceiling treatment, layered lighting, necessary cabinetry within the approved scope and correctly scaled furniture; then add controlled color, art, pattern and reflective accents until the room reaches a deliberate 60–75% visual density. Do not invent arches, columns, fireplaces, stairs, mezzanines, grand foyers, deep dropped ceilings or structural openings.
```

## 7. Renovation-level fragments

### `furnish`

```text
Keep every fixed finish and built-in element unchanged. Edit movable furniture, rugs, curtains, freestanding lighting, art and decor only.
```

### `refresh`

```text
Retain the layout and fixed boundaries. Update approved paint, wallpaper, wall finish, floor finish, cabinet-front finish, lighting, furniture, textiles, art and decor only.
```

### `light-remodel`

```text
Modify only explicitly masked non-structural built-ins. Do not infer permission to alter walls, openings, columns, beams, ceiling geometry, plumbing locations or camera geometry.
```

## 8. Unified negative prompt

```text
Versailles palace, royal palace, baroque carving, rococo furniture set, gilded molding everywhere, cherub ornament, throne room, ballroom, hotel lobby, nightclub, disco club, casino, stage set, runway, Studio 54 replica, mirror ceiling, colored club lighting, plastic gold, chrome overload, crystal on every surface, tufted furniture set, fake luxury showroom, random clutter, every wall patterned, too many animal prints, multiple competing marbles, souvenir collage, full 1980s replica, Dynasty set, Gatsby theme, Memphis primary-color room, oversized self portrait, people, faces, all-black KTV interior, invented arch, invented column, invented window, invented door, invented fireplace, changed opening count, changed window panels, altered walls, altered ceiling height, changed camera angle, recentered view, straight-on replacement view, perspective shift, zoom, crop change, aspect-ratio change, blocked circulation, oversized furniture, impossible cabinetry, impossible plumbing, text, watermark
```

## 9. Compilation order

```text
mandatory source-preservation block
+ universal positive base
+ selected profile fragment
+ selected room fragment
+ renovation-level fragment
+ raw-shell fragment when applicable
+ concise immutable observations
+ unified negative prompt in the model's negative field
```

Do not retrieve or append fragments from another style ID. The television mood reference belongs only in research provenance and must never enter this prompt chain.
