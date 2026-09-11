# California Modern 研究来源与权重

更新时间：2026-09-10

## 1. 研究方法

本知识库采用“官方自述／官方住宅案例 → 跨案例共识 → 可生成规则”的路径。设计师名字只保留作研究溯源；生产 Prompt 只使用跨项目的视觉语言。

证据权重：

- A：事务所官网的住宅项目、官方方法论。
- B：权威设计媒体对住宅案例的报道或设计师原话。
- C：影视场景、零售目录、趋势媒体，仅用于补充，不单独决定风格。

## 2. A 级来源

### Amber Interiors

- [About Us](https://amberinteriordesign.com/about/)：官方明确使用 `California-inspired, eclectic`，并强调 classic/heritage concepts、vintage furniture、found textiles、natural elements、livable and elevated environments。由此支持“自然材质 + 新旧混搭 + 可居住”的核心规则。
- [Projects](https://amberinteriordesign.com/projects/)：用于筛选住宅案例，不把单个项目的专属造型提升为风格 DNA。
- [Are We There Yet](https://amberinteriordesign.com/project/are-we-there-yet/)、[Dream Scene](https://amberinteriordesign.com/project/dream-scene/)、[Worth The Wait](https://amberinteriordesign.com/project/client-worth-the-wait/)：作为客厅、卧室、餐厨和细节的视觉校对页。

### Marmol Radziner

- [Architecture](https://www.marmol-radziner.com/-architecture/)：官方方法论强调人与空间、环境以及 indoor/outdoor activities 的关系，并将 California Modernists 作为长期语境。支持“光与场地优先”的底层逻辑。
- [Oakmont Interiors](https://www.marmol-radziner.com/oakmont-interiors/)：官方说明自然光来自墙面窗与屋脊天窗，Saltillo tile 延伸至室外露台，实木柜体贯穿空间。支持连续地面、自然光、室内外统一与实木整合。
- [The Firm](https://www.marmol-radziner.com/the-firm/)：用于确认其建筑、室内、景观和家具的一体化实践背景。

### Studio Shamshiri

- [Ranch House](https://studioshamshiri.com/projects/ranch-house/)：1952 ranch house 的更新以保留原建筑为前提；粗厚灰泥、陶土瓦、石壁炉、深色木梁与精炼线条、柔软织物形成张力，并混入同年代的斯堪的纳维亚、意大利和日本复古单品。支持“尊重原建筑 + 精炼/粗粝对照 + 跨地域复古混搭”。
- [Old Ranch](https://studioshamshiri.com/projects/old-ranch/)：在克制单色建筑基底上用雕塑家具、cashmere、mohair、velvet 增加温度。用于约束 California Modern 不是只有亚麻和浅木。
- [Projects archive](https://studioshamshiri.com/projects/)：优先筛选 Ranch House、Old Ranch、Northern California Estate、West Sunset、Amalfi、Filbert 等住宅，不使用酒店项目作为默认尺度。

### Commune Design

- [Residential portfolio](https://www.communedesign.com/portfolio/residential/)：Midcentury Rambler、Sea Ranch Condos、West Marin Retreat、Santa Cruz Beach House、Handcrafted Modern 等项目提供建筑、工艺和场地关系的住宅样本。

## 3. 补充来源

- [Amber Lewis press PDF: California Cool](https://amberinteriordesign.com/wp-content/uploads/2018/11/AmberInteriors_MarieClaire_March-2014.pdf)：1964 单层住宅、家庭活动与招待场景，用于验证 relaxed California living。
- [Amber Lewis press PDF: Modern Classic](https://amberinteriordesign.com/wp-content/uploads/2018/11/AmberInteriors_MarieClaire_July-2016.pdf)：laid-back eclectic、patterned rugs、greenery、statement lighting 与 old/new balance，用于软装校对。
- [Studio Shamshiri studio profile](https://studioshamshiri.com/studio/)：用于理解其修复、艺术指导和住宅实践背景，不直接转译为 Prompt。

## 4. 跨案例共识

### 高置信度

- 真实自然光与门窗关系先于装饰。
- 室内外通过视线、色温或材料连续建立联系，但不需要改动开口。
- 建筑基底简洁，材料需有触感和时间感。
- 新、旧、手作物件并置，避免成套采购感。
- 舒适、动线与家庭生活优先。

### 中置信度

- Limewash、travertine、terracotta、white oak 是常见手段，但不是每个房间的必选项。
- 藤编、皮革、复古地毯和绿植适合点缀，数量需要控制。
- Ranch、coastal、desert 只能作为 profile；必须由源图语境或用户选择触发。

### 不应提升为核心

- 拱门、暴露木梁、壁炉、落地窗等建筑元素：源图没有时不得新增。
- 全白空间、全浅木、全藤编：会滑向地产样板房、Japandi 或 Boho。
- 海岸、农舍或 Southwestern 的字面符号。

## 5. 与用户原始参考清单的调整

- Amber Interiors：保留，作为可居住混搭的主要锚点。
- Studio Shamshiri：保留，优先住宅项目。
- Commune Design：保留，作为场地与工艺补充。
- Studio McGee：不作为核心锚点，部分内容容易把模型推向 Transitional / Modern Farmhouse；若未来使用，仅选无农舍符号的住宅局部。
- Jake Arnold：可作为深色暖调和触感补充，但不是本版核心，以减少与 Maximal Luxe 的交叉。

## 6. 版权与使用范围

所有外部图片版权归原权利人。本阶段只记录官方项目页和公开媒体页，用于内部人工研究与 Prompt 校对；未取得授权前，不复制进公开仓库、不作为模型训练数据、不上传为第三方生成模型的生产参考图。
