# Home Style Presets｜三套风格总控对照

版本：`v0.1-research`
更新时间：2026-09-10
面向市场：美国住宅室内 AI 改造

本文是三套风格知识库的总控层。它用于风格路由、反串风格检查和设计评审，不替代各风格的详细知识库。

## 1. 产品命名与运行时 ID

| 前端名称 | 中文工作名 | `style_id` | 一句话承诺 |
|---|---|---|---|
| Modern East | 摩登东方 | `modern_east` | Contemporary calm shaped by Eastern restraint. |
| California Modern | 加州现代 | `california_modern` | Sunlit, natural, relaxed modern living. |
| Maximal Luxe | 极繁奢华 | `maximal_luxe` | Curated drama, rich color, and livable glamour. |

生产 Prompt 不出现事务所、设计师、影视剧或角色名称。这些名称仅保留在 `sources/` 内作为研究溯源。

## 2. 三套风格的最短判别式

| 维度 | Modern East | California Modern | Maximal Luxe |
|---|---|---|---|
| 情绪 | 安静、内敛、仪式感 | 明亮、松弛、亲自然 | 戏剧性、自信、社交感 |
| 空间策略 | 留白、框景、层层显露 | 开放流动、室内外连续 | 分层陈列、焦点场景、包裹感 |
| 视觉密度 | 低，约 25–40% | 中低，约 35–50% | 中高，约 60–75% |
| 主材 | 深浅木、哑光石、矿物涂料、古铜 | 浅木、石灰基墙面、亚麻、陶土、自然石 | 漆面木、强纹理石材、天鹅绒、镜面、黄铜 |
| 主色 | 暖象牙、灰褐、木棕、墨黑点缀 | 日晒白、沙色、蜂蜜木、鼠尾草 | 茄紫、酒红、祖母绿、墨黑、奶油色 |
| 家具 | 低矮、克制、雕塑感单品 | 舒适、松弛、复古与手作混搭 | 曲线、珠宝感、成组与收藏式搭配 |
| 光 | 柔和间接光、低眩光 | 充足自然光、温暖实用光 | 分层氛围光、装饰灯具、受控反射 |
| 最大风险 | 变成传统中式、Japandi 或酒店大堂 | 变成农舍、海岸主题或波西米亚杂乱 | 变成宫殿、夜店、影视布景或无序堆砌 |

## 3. 风格互斥规则

### Modern East 不得吸收

- California Modern 的全浅木、乡村陶器堆叠、海岸蓝白主题。
- Maximal Luxe 的多组珠宝色、镜面墙、密集图案和高亮金属。
- 传统中式符号、日式房间构件和公建大堂尺度。

### California Modern 不得吸收

- Modern East 的大面积深色木包裹、仪式性对景和东方符号暗示。
- Maximal Luxe 的深珠宝色包裹、镜面/金属主导和高密度装饰。
- Farmhouse、Coastal、Boho、Southwestern theme 等字面主题化表达。

### Maximal Luxe 不得吸收

- Modern East 的大面积空场与几乎无装饰的克制。
- California Modern 的全米白、全亚麻、未经编辑的乡村或波西米亚质感。
- 巴洛克宫殿复制、Versailles 布景、Studio 54 夜店复制和廉价金色堆叠。

## 4. 共用生成边界

三套知识库只回答“美学应该是什么”。以下能力属于 Agent 与图像编辑管线，但每次生成都必须把相应约束编译进任务：

- 保留源图宽高比、裁切、相机位置、拍摄高度、焦距感和消失点。
- 保留墙、柱、梁、楼板、层高、门窗、开口数量与每个门窗的分格关系。
- 默认保留厨房与卫浴给排水位置、壁炉和固定柜边界。
- 只在明确的可编辑蒙版内做饰面、家具、灯具、窗帘、艺术品和少量非结构硬装。
- 输出必须维持可信的住宅尺度、动线、人体工学和施工逻辑。

结构保护失败是全局硬失败，不能由风格分数抵消。

## 5. 建议运行时检索键

```text
style_id
profile
room_type
renovation_level
room_size_band
daylight_level
```

Agent 每次只检索：一套风格、一个 profile、一个房间 recipe、一个改造等级，以及该风格的全局负向边界。禁止一次混入两套风格知识。

## 6. 现阶段成熟度

| 风格 | 文本知识库 | 英文 Prompt | 结构化 YAML | 参考图 |
|---|---|---|---|---|
| Modern East | 已完成 v0.1 | 已完成 | 已完成 | 已有内部校对集 |
| California Modern | 已完成 v0.1 | 已完成 | 已完成 | 已建立来源索引，待授权策略确认后归档原图 |
| Maximal Luxe | 已完成 v0.1 | 已完成 | 已完成 | 已建立来源索引，待授权策略确认后归档原图 |
