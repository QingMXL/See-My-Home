# Modern East Prompt Library v0.2

这些 Prompt 是模型无关的语义组件。Style Agent 应按输入图、房间、子风格和改造等级选择组件，再由模型适配器转换为目标 API 的格式。

禁止把事务所或设计师名称加入生产 Prompt。禁止假定 `(text:0.35)` 等权重语法跨模型有效。

## 1. 输入变量

```text
{{room_type}}
{{room_observations}}
{{immutable_architecture}}
{{fixed_fixtures}}
{{editable_scope}}
{{renovation_level}}
{{profile}}
{{requested_features}}
{{must_keep_objects}}
```

## 2. 通用正向基础片段

```text
Restyle this real residential {{room_type}} in an unmistakable Modern East aesthetic: contemporary architectural clarity shaped by Eastern restraint, layered views, calibrated negative space, strong material hierarchy, and a composed relationship between light, nature, art, and daily life. Build one clear spatial datum and a complete residential composition. Use warm ivory mineral plaster, stone greige, mushroom taupe, a substantial matte dark-oak or smoked-walnut element, one pale honed limestone or quiet-veined marble anchor, tactile linen or bouclé upholstery, a layered wool or silk-blend rug, and restrained satin-bronze or blackened-metal details. Add tailored sculptural furniture at normal residential scale, functional side pieces, full-height window treatment where appropriate, one confident ink-like abstract artwork, paper- or silk-like diffused light, and one handcrafted ceramic or stone object. Design a visible fifth-plane ceiling treatment with a shallow applied perimeter reveal or cove, continuous warm indirect illumination, focused wall wash, and one room-scaled statement fixture where appropriate, while preserving the structural ceiling plane and height. The result must be richly resolved and recognizable at first glance, never under-furnished, generic beige contemporary, generic warm minimalism, literal historical styling, or a hotel lobby.
```

## 3. 强制结构保护片段

```text
This is a controlled image edit, not a scene replacement. Preserve the input photograph as the pixel-registered geometric and camera authority. Keep the exact source aspect ratio, crop, framing, camera position, camera height, focal-length feel, vanishing points and perspective. Keep the exact room envelope and wall junctions. Preserve both visible edges, silhouette, apparent width and image-border position of every column and beam. Preserve the structural slab plane, ceiling height, doors, windows, openings, recesses, glazing divisions and built-in boundaries. Keep the exact count, dimensions, position and panel divisions of all doors and windows. Keep all fixed fixtures and service locations listed in {{fixed_fixtures}}. Make changes only inside {{editable_scope}}. Decorative cladding may change surface appearance but must not move, narrow, widen, merge, hide or reshape structure. Do not recenter, straighten, widen, crop, zoom, rotate, enlarge, simplify, rebuild, reframe or reinterpret the architecture. Maintain realistic residential clearances and circulation.
```

注意：此片段必须与 Agent 的不可编辑 Mask、结构条件及后验校验共同使用。

## 4. 子风格片段

### `quiet-poise`｜默认

```text
Favor quiet poise without visual weakness: warm pale neutrals, tactile fabrics, a clearly visible dark-timber datum, gentle natural light, confident abstract art, comfortable complete furnishing, and deliberate breathing room. Pair mineral plaster, honed stone, dark timber, layered textile and bronze in a controlled hierarchy. Keep the room distinctly Modern East and richly resolved while suitable for an everyday American home.
```

### `urban-elegance`

```text
Favor urban elegance: slim dark frames, smoked or reeded glass, warm gray and espresso tones, precise metal detailing, tailored furniture, and a lightly cosmopolitan rhythm. Keep historical references abstract and avoid themed Shanghai nostalgia.
```

### `sculptural-luxe`

```text
Favor sculptural luxury while remaining residential: one expressive light, artwork, furniture piece, or stone element as the single focal gesture; surround it with calm surfaces and controlled negative space. Do not introduce monumental hotel scale.
```

### `warm-residence`

```text
Favor warm residential comfort: warm pale oak, ivory and mushroom textiles, soft ambient light, a small amount of dark framing, and inviting furniture with normal seat height and generous comfort. Retain enough contrast to remain Modern East rather than Japandi.
```

## 5. 房间片段

### 5.1 客厅

```text
Create a conversation-oriented living room with one primary sofa group, realistic side seating, a restrained stone or dark-timber coffee table, and a properly scaled rug. Integrate any existing television or fireplace instead of removing it. Use one primary artwork, one optional architectural plant, and very few tabletop objects. Zone an open plan through furniture, rug, and light rather than new walls. Keep the room intimate and residential; avoid lobby seating, double-living-room staging, or oversized chandeliers.
```

### 5.2 主卧

```text
Create a quiet, enveloping primary bedroom with an integrated but restrained headboard composition, tactile neutral bedding, warm timber or textured wall panels, functional bedside surfaces, and soft layered lighting. A window bench or lounge chair may be added only when circulation allows. Preserve every window and door. Avoid hotel-suite staging, excessive symmetry, dramatic marble feature walls, and floor-level Japanese furniture.
```

### 5.3 厨房与餐厅

```text
Create a functional contemporary kitchen and dining space using matte timber cabinetry, pale low-contrast stone, precise dark or bronze details, and integrated appliances. Preserve all existing service points, appliances, sink, cooktop, ventilation, island footprint, and cabinet boundaries unless explicitly included in the editable scope. Use a round table to encourage gathering when the room shape permits; otherwise use a softly rounded rectangular table. Keep working clearances believable. Allow only one visually expressive stone surface. Avoid display-kitchen theater, dominant wine walls, decorative cooking equipment, or impossible floating counters.
```

### 5.4 浴室

```text
Create a calm, warm Modern East bathroom with honed pale stone, a restrained timber vanity, reeded or softly textured glass, low-sheen metal fixtures, discreet storage, soft mirror lighting, and one subtle handcrafted or botanical accent. Preserve the exact locations of the toilet, vanity, shower, bathtub, drains, windows, and doors unless explicitly editable. Keep wet-zone construction plausible and easy to maintain. Avoid a hotel spa, dramatic bookmatched marble everywhere, decorative indoor trees, or an impossible sunken bath.
```

## 6. 毛坯房完成片段

把这一片段附加到相应房间 Prompt，而不是单独生成空间。

```text
The input is an unfinished shell. Treat every visible wall, slab edge, beam, column, structural ceiling plane, door opening, window opening, and camera relationship as immutable. Complete every usable zone through substantial but coherent finishes, a shallow non-structural ceiling finish layer where appropriate, layered lighting, cabinetry only where functionally justified, correctly scaled furniture, textiles, art, and decor. Do not leave the room looking empty or merely staged with a few objects. Do not invent additional windows, doors, fireplaces, stairs, mezzanines, vaulted ceilings, structural openings, or deep dropped ceilings. Use conservative assumptions for plumbing and electrical services, and keep the design buildable within the visible envelope.
```

## 7. 旧房改造片段

```text
The input is an existing lived-in home. Retain all architecture and fixed services. Replace or refinish only the surfaces, movable furniture, lighting, window treatments, and decor allowed by {{renovation_level}}. Preserve useful household functions and make the room feel renewed rather than erased. Do not remove real-life features merely to create a cleaner render.
```

## 8. 改造等级片段

### `furnish`

```text
Limit the redesign to movable furniture, rugs, curtains, freestanding lighting, art, plants, and decor. Preserve every architectural finish and built-in element.
```

### `refresh`

```text
Allow paint, wall finish, flooring appearance, cabinet-front finish, movable furniture, textiles, art, decorative lighting, and a shallow applied ceiling finish or perimeter cove that does not alter structural height, beams, columns, or opening heads. Preserve the location, size, geometry, and function of every built-in element and fixture.
```

### `light-remodel`

```text
Allow selected non-structural built-in finishes or cabinetry only where explicitly masked. Never alter the room envelope, walls, columns, beams, doors, windows, openings, ceiling height, or unverified service locations.
```

## 9. 统一 Negative Prompt

仅在目标模型支持独立负向 Prompt 时使用。否则由适配器将关键禁令转为正向约束或校验规则。

```text
traditional Chinese theme room, ornate Chinese carving, dragon motif, phoenix motif, dense cloud pattern, imperial palace decor, glossy red rosewood furniture set, replica dynasty furniture, oversized antique cabinet, red lantern theme, calligraphy wall decal, chinoiserie, blue-and-white porcelain collection, tatami, shoji screen, Japanese tea room, floor cushions, floor-level dining table, all-pale-wood Japandi, exaggerated wabi-sabi decay, rustic farmhouse, bohemian decor, high-saturation red, bright emerald green, mirror-polished gold, glossy burgundy wood, busy multicolor marble, plastic stone texture, excessive black marble, too many materials, hotel lobby, reception lounge, banquet hall, sales gallery, museum gallery, luxury showroom, monumental symmetry, oversized chandelier, theatrical hospitality lighting, excessive ceiling sculpture, empty mansion staging, altered architecture, added window, removed window, added door, removed door, changed opening, changed opening count, changed door panels, changed window panels, removed column, hidden beam, raised ceiling, enlarged room, shifted camera, changed camera height, recentered view, straight-on replacement view, changed focal length, distorted perspective, zoom, crop change, aspect-ratio change, blocked doorway, blocked window, floating furniture, duplicated furniture, impossible cabinetry, unusable kitchen, impossible plumbing, text, logo, watermark
```

## 10. 推荐拼接顺序

```text
[edit action]
+ [input observations]
+ [mandatory structural preservation]
+ [universal Modern East base]
+ [selected subprofile]
+ [room fragment]
+ [raw-shell or existing-home fragment]
+ [renovation-level fragment]
+ [user-requested features]
+ [render quality instruction]
+ [negative prompt through model adapter]
```

### 完整示例：普通公寓旧客厅，Refresh

```text
Restyle the supplied photograph rather than generating a new room. The input is a medium-size apartment living room with one window wall, an existing doorway, a structural column, a flat ceiling, and a fixed fireplace.

Preserve the input photograph as the geometric and camera authority. Keep the exact room envelope, wall positions, structural column, ceiling height, doorway, windows, glazing divisions, fireplace, camera position, lens perspective, crop, and exterior view. Make changes only to wall and floor finishes, movable furniture, lighting, curtains, art, plants, and decor. Do not enlarge or rebuild the room.

Restyle this real residential living room in the Modern East aesthetic: a refined contemporary interior shaped by Eastern restraint, layered views, calibrated negative space, quiet material contrast, and a strong relationship between light, nature, and daily life. Use warm ivory walls, stone greige textiles, restrained matte dark-oak framing, one pale honed-stone surface, and sparse satin-bronze details. Create a conversation-oriented layout with one comfortable sofa group, a properly scaled rug, a simple stone or dark-timber coffee table, one abstract artwork, and one architectural plant. Integrate the existing fireplace. Use soft daylight and warm low-glare lamps. Favor quiet poise and everyday residential comfort. The result should feel calm, collected, refined, highly livable, and photographed as a real home.
```
