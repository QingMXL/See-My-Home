# Modern East Prompt Library v0.1

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
Restyle this real residential {{room_type}} in the Modern East aesthetic: a refined contemporary interior shaped by Eastern restraint, layered views, calibrated negative space, quiet material contrast, and a strong relationship between light, nature, and daily life. Use clean architectural planes, balanced asymmetry, subtle framed sightlines, and at most one controlled sculptural gesture. Build a warm, low-saturation palette from warm ivory, stone greige, mushroom taupe, matte dark oak or smoked walnut, pale honed stone, tactile neutral textiles, and sparse satin-bronze or blackened-metal details. Choose comfortable, conventionally scaled residential furniture with tailored silhouettes and softly rounded edges. Add one restrained abstract artwork or handcrafted object and minimal natural greenery. Use realistic soft daylight, warm indirect illumination, low glare, and believable material texture. The result must feel collected, calm, culturally nuanced, contemporary, highly livable, and photographed as a real home rather than a showroom.
```

## 3. 强制结构保护片段

```text
Preserve the input photograph as the geometric and camera authority. Keep the exact room envelope, wall positions, columns, beams, ceiling height, doors, windows, openings, glazing divisions, built-in boundaries, camera position, lens perspective, crop, and exterior view. Keep all fixed fixtures and service locations listed in {{fixed_fixtures}}. Make changes only inside {{editable_scope}}. Do not enlarge, simplify, rebuild, reframe, or reinterpret the architecture. Maintain realistic residential clearances and circulation.
```

注意：此片段必须与 Agent 的不可编辑 Mask、结构条件及后验校验共同使用。

## 4. 子风格片段

### `quiet-poise`｜默认

```text
Favor quiet poise: warm pale neutrals, tactile fabrics, restrained dark timber framing, gentle natural light, sparse art, comfortable seating, and generous but functional breathing room. Keep every gesture subtle and suitable for an everyday American home.
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
The input is an unfinished shell. Treat every visible wall, slab edge, beam, column, ceiling plane, door opening, window opening, and camera relationship as immutable. Complete the room through finishes, lighting, cabinetry only where functionally justified, furniture, textiles, and decor. Do not invent additional windows, doors, fireplaces, stairs, mezzanines, vaulted ceilings, or structural openings. Use conservative assumptions for plumbing and electrical services, and keep the design buildable within the visible envelope.
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
Allow paint, wall finish, flooring appearance, cabinet-front finish, movable furniture, lighting, textiles, and decor. Preserve the location, size, geometry, and function of every built-in element and fixture.
```

### `light-remodel`

```text
Allow selected non-structural built-in finishes or cabinetry only where explicitly masked. Never alter the room envelope, walls, columns, beams, doors, windows, openings, ceiling height, or unverified service locations.
```

## 9. 统一 Negative Prompt

仅在目标模型支持独立负向 Prompt 时使用。否则由适配器将关键禁令转为正向约束或校验规则。

```text
traditional Chinese theme room, ornate Chinese carving, dragon motif, phoenix motif, dense cloud pattern, imperial palace decor, glossy red rosewood furniture set, replica dynasty furniture, oversized antique cabinet, red lantern theme, calligraphy wall decal, chinoiserie, blue-and-white porcelain collection, tatami, shoji screen, Japanese tea room, floor cushions, floor-level dining table, all-pale-wood Japandi, exaggerated wabi-sabi decay, rustic farmhouse, bohemian decor, high-saturation red, bright emerald green, mirror-polished gold, glossy burgundy wood, busy multicolor marble, plastic stone texture, excessive black marble, too many materials, hotel lobby, reception lounge, banquet hall, sales gallery, museum gallery, luxury showroom, monumental symmetry, oversized chandelier, theatrical hospitality lighting, excessive ceiling sculpture, empty mansion staging, altered architecture, added window, removed window, added door, removed door, changed opening, removed column, hidden beam, raised ceiling, enlarged room, shifted camera, distorted perspective, blocked doorway, blocked window, floating furniture, duplicated furniture, impossible cabinetry, unusable kitchen, impossible plumbing, text, logo, watermark
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

