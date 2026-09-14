# California Modern Prompt Library v0.2

Production prompts are English-only. Names of designers, studios, publications, and projects must never be compiled into a production prompt.

## 1. Input variables

```text
{room_type}
{profile}: sunlit-casual | ranch-modern | coastal-modern | desert-warm
{renovation_level}: furnish | refresh | light-remodel
{editable_scope}
{immutable_observations}
{daylight_level}
{room_size_band}
```

## 2. Universal positive base

```text
Edit the supplied interior photograph into a complete, clearly recognizable California Modern residence. Create a sunlit, relaxed and grounded atmosphere with clean architectural planes, warm handcrafted materials, tactile textiles, comfortable proportions, and an edited tension between contemporary and vintage-inspired furnishings. Target a visibly furnished 50–65% visual density without blocking daylight or circulation. Use a warm limewash or mineral-plaster envelope; one major wall in woven linen or grasscloth wallcovering, shallow white-oak panels, restrained upholstered textile, or handmade tile when finishes are editable; one coherent oak family; quiet honed limestone, travertine or terracotta; at least three textile layers across linen, wool, bouclé and leather; and restrained aged-brass, blackened-metal or charcoal details. Pair a deep comfortable sofa with non-matching sling, cane, leather, or sculptural lounge seating and a substantial burl-wood, aged-oak, cast-stone or monolithic-stone table. Add collected ceramics, timber objects and one contemporary material accent in cast resin, translucent acrylic, smoked or colored glass, or perforated metal, kept warm and subordinate. Treat the ceiling as a designed fifth plane through a shallow plaster reveal or cove, an optional limited oak inset, warm indirect light, one linen, parchment, frosted-glass, carved-wood, or woven sculptural fixture, and practical wall-wash or task lighting, without changing the structural ceiling plane, beams, columns, room height, or opening heads. Replace or integrate generic construction downlights. Keep the result elevated, functional, timeless and genuinely lived in—never an empty beige room.
```

## 3. Mandatory source-preservation block

```text
This is a controlled image edit, not a scene replacement. Preserve the source image's exact aspect ratio, crop, framing, camera position, camera height, focal-length feel, vanishing points, and perspective. Preserve the exact room envelope and every visible wall, column, beam, ceiling plane, door, window, recess and opening. Keep the exact count, dimensions, position and panel divisions of all doors and windows. Do not recenter, straighten, widen, crop, zoom, rotate or invent architecture. Modify only the approved finishes, furnishings, lighting and decor within {editable_scope}. Maintain realistic residential scale, clearances and circulation.
```

This block communicates intent only. The Agent must also enforce the same constraints using masks, conditioning, generation settings, and post-generation validation.

## 4. Profile fragments

### `sunlit-casual`｜default

```text
Use sun-washed warm whites, sand and oatmeal neutrals, matte honey-toned oak, relaxed linen upholstery, a softly worn wool rug, at least two non-matching vintage-inspired or handcrafted counterpoints, restrained charcoal details, and grouped handmade ceramics. Favor easy comfort, filtered daylight and understated craftsmanship without visual weakness.
```

### `ranch-modern`

```text
Respect any ranch-house character already visible in the source. Pair warm plaster, existing timber elements, grounded stone or terracotta, and refined modern furniture with soft textiles. Do not add beams, fireplaces, arches, terracotta floors or rustic architecture unless already present or explicitly masked for change.
```

### `coastal-modern`

```text
Use airy warm white, pale sand, lightly bleached wood, quiet limestone, linen, and a small amount of muted blue-gray. Express coastal ease through light and material, never through nautical symbols, striped themes, shells, ropes or beach signage.
```

### `desert-warm`

```text
Use warm mineral plaster, clay and tobacco accents, matte oak, grounded stone, woven wool and one restrained dry-climate plant. Keep the palette muted and architectural; avoid Southwestern motifs, themed cactus prints, cow skulls and rustic resort styling.
```

## 5. Room fragments

### Living room

```text
Arrange one deep, comfortable linen or nubby-wool sofa and one or two non-matching sling, leather, cane, or sculptural accent chairs around a substantial burl-wood, aged-oak, cast-resin, or monolithic-stone coffee table. Anchor the seating with a correctly sized textured rug and use full-height relaxed drapery while keeping doors, windows and circulation unobstructed. Let an existing view, existing fireplace, or one piece of abstract art serve as the focal point. Add an artisanal floor lamp, a few books, grouped ceramics and one realistically scaled plant.
```

### Primary bedroom

```text
Create a calm, softly layered bedroom with a substantial upholstered or timber bed against limewash, woven-linen wallcovering, or a restrained padded textile headboard wall; breathable linen and cotton bedding with one quiet woven stripe or tonal geometric; useful mismatched bedside surfaces; warm low-glare lighting; and relaxed full-height drapery fitted to the existing window. Add one vintage-inspired chair or bench when circulation permits. Keep decoration quieter than the living room and avoid hotel-suite staging or rigid showroom symmetry.
```

### Kitchen and dining

```text
Keep all existing appliance, plumbing and service locations. Use matte warm timber or warm-white cabinetry, a quiet honed-stone surface, simple hardware and, if appropriate, one restrained handmade-tile accent. Make the dining area informal and sociable with a round or softly rectangular table, comfortable chairs and one simple sculptural pendant at residential scale.
```

### Bathroom

```text
Keep all fixture and wet-zone locations. Use warm honed stone, pale timber, mineral-toned surfaces, maintainable detailing, a clean mirror and soft face-level lighting. Allow one handcrafted accent only. Avoid cave-like spas, all-over microcement, tropical planting and fantasy wet rooms.
```

## 6. Raw-shell completion fragment

```text
Complete the unfinished room without changing its visible geometry. Treat the existing walls, slab edges, beams, columns, structural ceiling plane, door openings and window openings as immutable geometry, but treat unfinished surfaces and temporary construction lighting as editable within scope. Add a warm mineral envelope, one designed major wall, a shallow non-structural ceiling treatment, integrated indirect and decorative lighting, necessary cabinetry within scope, correctly scaled low comfortable furniture, at least three textile layers, vintage/handcrafted counterpoints and restrained collected decor. Do not leave raw walls, a blank slab with isolated downlights, or usable zones empty. Do not invent daylight, views, fireplaces, arches, stairs, mezzanines, deep dropped ceilings or structural openings.
```

## 7. Renovation-level fragments

### `furnish`

```text
Keep every fixed finish and built-in element unchanged. Edit movable furniture, rugs, curtains, freestanding lighting, art, plants and decor only.
```

### `refresh`

```text
Retain the layout and fixed boundaries. Update approved paint; mineral, woven-textile, timber-panel, upholstered-panel or handmade-tile wall finish; floor finish; cabinet-front finish; decorative lighting and generic downlight integration; furniture; textiles; art; and decor only.
```

### `light-remodel`

```text
Modify only explicitly masked non-structural built-ins. Do not infer permission to alter any wall, opening, column, beam, ceiling geometry, plumbing location or camera geometry.
```

## 8. Unified negative prompt

```text
traditional farmhouse, modern farmhouse template, barn door, farmhouse sign, distressed white furniture, industrial cage pendant, nautical theme, navy-and-white stripes, anchors, shells, rope decor, beach sign, boho clutter, macrame overload, rattan everywhere, dense ethnic prints, plant jungle, Southwestern theme, cow skull, cactus print, all-pale-wood Japandi, tatami, shoji screen, Japanese tea room, cold gray flip, sterile all-white staging, bland beige minimalism, matching furniture set, cheap plastic acrylic, untreated raw wall, blank white ceiling, only two isolated downlights, hotel lobby, resort lobby, monumental chandelier, double-height fantasy, glossy marble everywhere, excessive black metal, fake fireplace, invented window, invented door, invented beam, changed opening count, changed window panels, altered walls, altered columns, altered ceiling height, changed camera angle, recentered view, straight-on replacement view, perspective shift, zoom, crop change, aspect-ratio change, blocked circulation, oversized furniture, impossible cabinetry, impossible plumbing, text, watermark, people
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

Do not retrieve or append fragments from another style ID.
