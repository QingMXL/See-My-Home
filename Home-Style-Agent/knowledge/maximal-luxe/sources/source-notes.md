# Maximal Luxe 研究来源与权重

更新时间：2026-09-10

## 1. 研究方法

本风格使用两层证据：影视场景负责提供明确的情绪与强度样本，成熟住宅设计负责把这种情绪转译为可居住规则。影视剧、角色和设计师名字只保留作研究溯源，不进入生产 Prompt。

证据权重：

- A：事务所或品牌官网的住宅项目与官方设计理念。
- B：制作设计师对影视场景的直接说明、权威设计机构的风格词条。
- C：媒体二次解读，仅作交叉验证。

## 2. 影视情绪样本：1984 Simone Grove

- [Apartment Therapy: Why Women Kill set design](https://www.apartmenttherapy.com/why-women-kill-set-design-decor-36645775)：文章采访 production designer Mark Worthington，确认三段时间线在同一住宅概念下分别搭景。1984 年 Simone 空间被设定为与 1963 年相反的外放极端：deep eggplant purple 墙面、gold 与 shiny brass、glass 和 mirrors；这些反射面还服务于角色的自恋隐喻。
- [Future Associate: Why Women Kill S1](https://www.future-associate.com/why-women-kill-s1)：确认 1963、1984 与 present-day 三条时间线及对应视觉制作背景。

### 转译结论

- 保留：深茄紫/梅子、黄铜、玻璃/镜面、强个性、社交型戏剧感。
- 降权：全屋极端紫色、过多亮黄铜、遍布镜面。
- 删除：巨幅屋主肖像、剧情道具、角色隐喻和对电视剧画面的直接复刻。
- 生产环境只使用 profile 名 `eighties-socialite`，不使用剧名或角色名。

## 3. A 级住宅来源

### Kelly Wearstler Studio

- [Interior Projects](https://kellywearstler.com/pages/interior-projects)：官方将住宅设计描述为 vintage 与 custom、rough plaster 与 polished stone、historic 与 new 的张力，并强调空间不应读成单一“scheme”。支持材质对照、雕塑构图与收藏式层次。
- [Magnum Opus](https://kellywearstler.com/pages/project/magnum-opus)、[Seal Beach](https://kellywearstler.com/pages/project/seal-beach)：用于住宅尺度、艺术、石材与雕塑家具的视觉校对。

### Jonathan Adler Design Studio

- [About](https://jonathanadler.com/pages/about)：官方使用 `Modern American Glamour`，并提出 `luxe and livable`、严肃设计但不自我严肃。支持本风格“华丽且能住”的产品核心。
- [Design Studio](https://jonathanadler.com/pages/design-studio)：官方住宅项目清单与 studio 定位，强调 art、design、craftsmanship 的结合。
- [Interiors](https://jonathanadler.com/pages/interiors)：说明其大胆工作同时也可创造 calm palette、refined texture 与 natural surroundings；支持风格内必须有视觉停顿。
- [Shelter Island Retreat](https://jonathanadler.com/pages/interiors-private-residence-1)：作为住宅陈列密度与图案组合的视觉校对页。

### Martyn Lawrence Bullard Design

- [Winnie Harlow's LA Home](https://martynlawrencebullard.com/projects/winnie-harlow-supermodel-sanctuary/)：从 blank white shell 出发，用黑色图形、1970s 黄铜棕榈灯、雕塑家具、1930s Hollywood bedroom 与个人艺术建立“calm + glamour”；同时强调这首先是家，要舒适、不矫饰。它是默认 `edited-glamour` 的主要案例。
- [Residential Projects](https://martynlawrencebullard.com/residential-projects/)：用于筛选住宅样本，不使用酒店、餐厅和商业项目决定默认尺度。
- [RuPaul's Beverly Hills Mansion](https://martynlawrencebullard.com/projects/hollywood-regency-for-ru-paul/)：提供 Hollywood Regency、lacquer、velvet、silk、leopard、chinoiserie 和强舞台感的高强度边界。该项目刻意把住宅当舞台，因此只用于“最大强度和反例”，不作为默认输出。

## 4. 风格术语依据

- [Getty Research Institute, Art & Architecture Thesaurus: Hollywood Regency](https://www.getty.edu/vow/AATFullDisplay?find=geometric&logic=AND&note=&subjectid=300374864)：定义该风格为洛杉矶本土、混合多种历史语言并具有电影 glamour 的设计，常见 bold prints、white 与 gold 的对照。用于确认历史词汇，而不是鼓励直接复古。
- [Los Angeles City Planning historical report](https://planning.lacity.gov/plndoc/Staff_Reports/2023/09-21-2023/CHC_2023_5913_HCM_250_N_Norton_Avenue_UC.pdf)：将 Hollywood Regency 说明为与电影布景及行业文化关联的现代化 Regency pastiche。用于建立“风格天生具有舞台风险”的负向边界。

## 5. 跨案例共识

### 高置信度

- 丰富需要清晰的焦点、色彩层级和材质层级。
- 曲线/雕塑家具、艺术、复古单品和触感织物共同建立身份。
- 哑光与亮面、历史与当代、粗粝与精致之间的对照比单纯堆贵材料更重要。
- 住宅舒适、功能与个性必须同时存在。

### 中置信度

- 深茄紫、祖母绿、酒红、黑、奶油色适合作主场域，但每个视图只选有限组合。
- 漆面、黄铜、镜面、烟熏玻璃和强纹石材适合制造闪光点，必须设预算。
- 动物纹可作为小面积高强度选项，默认关闭。

### 不应提升为核心

- 影视角色的大幅自画像、整套 1980s 复制和剧情道具。
- Ballroom、Studio 54、酒店大堂和超大豪宅尺度。
- 巴洛克/洛可可宫殿雕花、满屋水晶与塑料金。

## 6. 与用户原始参考清单的调整

- Kelly Wearstler、Jonathan Adler、Martyn Lawrence Bullard：保留为核心锚点，但只使用住宅或住宅化原则。
- Roman and Williams：其很多公开代表作是 hospitality，暂不作为 v0.1 核心，避免酒店化。
- Dimore Studio：可用于未来的色彩与历史层次补充，但其戏剧性较强，需住宅筛选后再纳入。
- 《Why Women Kill》：明确限定为第一季 1984 Simone 线，且只做 mood case study。

## 7. 版权与使用范围

影视剧照和项目摄影均受版权保护。本阶段只保存来源链接和人工文字观察；未取得授权前，不复制进公开仓库、不作为训练数据、不上传为第三方生成模型的生产参考图。生产生成只使用抽象后的规则与 Prompt。
