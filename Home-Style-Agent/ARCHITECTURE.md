# Home Style Agent 架构决策

状态：`accepted-for-scaffold`  
日期：2026-09-04

## 1. 知识放在哪里

Modern East 采用三层结构：

| 层 | 位置 | 内容 | 是否包含图片 |
|---|---|---|---|
| 研究源 | `knowledge/modern-east/` | 完整研究、出处、结构化规则、Prompt 组件 | 是，仅供内部校对 |
| 生产投影 | 构建生成的 Skill 或检索文档 | 去掉设计师名称、出处说明和图片后的模型可读规则 | 否 |
| 运行时绑定 | 服务端配置 / ZooWork Agent | `style_id -> knowledge version -> remote resource` | 否 |

仓库中的研究源是事实来源；远端资源是可重新生成的部署产物，不应成为唯一副本。

## 2. 为什么不放进 Home Layout Agent

Home Layout Agent 管理平面图、房间功能和 Home Model；Home Style Agent 管理照片编辑、材质、色彩、家具和氛围。把两者合并会让“改变布局”和“只做风格改造”的权限边界变得模糊，也会让同一 UI 中的两个 Agent 无法独立升级和回滚。

建议保持三个独立标识：

- `home-layout`
- `home-style`
- `home-furniture`

## 3. 知识库与 Agent 的职责

知识库回答“Modern East 看起来是什么”：风格 DNA、材质、色彩、家具、灯光、房间配方和反模式。

Agent / Runtime 回答“这张图可以改什么、怎样调用模型、怎样验收”：

- 识别并锁定墙、柱、梁、窗、门、洞口、天花轮廓、相机位置、视角和裁切；
- 区分软装、表面饰面、可替换固定家具与不可变建筑结构；
- 选择与房间类型匹配的最小知识片段；
- 编译模型相关 Prompt；
- 生成后执行结构一致性和风格一致性检查；
- 结构漂移时不发布结果。

结构保护规则可以在所有风格之间复用，不应重复写入每个风格知识库。

## 4. 推荐请求链路

1. UI 上传照片，选择 `modern_east` 和房间类型。
2. 应用后端保存原图，并生成 Agent 可访问的短期资源引用。
3. Runtime 分析原图，产生 `immutable_elements` 与 `editable_elements`。
4. 服务端目录把 `modern_east` 解析成固定知识版本；客户端无权提供远端知识 ID。
5. 只选择通用片段、对应房间片段、用户偏好与统一负向约束。
6. ZooWork Agent 调用图像编辑/生成能力。
7. QA 比较输入和输出的结构锚点；不合格结果失败关闭。

## 5. ZooWork 绑定策略

### 当前可验证方案：私有 Skill

把生产投影打包成 `modern-east-style` Skill，上传并挂到独立的 Home Style Agent。事件中同时传入确定性的 `style_id` 和 `knowledge_version`，避免模型凭自然语言猜风格。

当未来风格很多时，不建议每次把所有风格全文装入 Prompt。可以选择：

- 每个风格一个 Skill，由明确的风格 ID 触发；或
- 服务端检索/裁剪后，通过受控事件注入当次需要的片段。

### 待验证方案：ZooWork Knowledge Base ID

当前 SDK `0.5.0` 没有公开对应字段或方法。收到 ID 后需要同时确认至少一项：控制台功能名称、官方 API 路径、SDK 版本或一段官方接入示例。确认后将适配器放在服务端，并使用环境变量 `ZOOWORK_STYLE_KNOWLEDGE_BASE_ID`；不要把 ID 写进 UI、URL 查询参数或客户端持久化状态。

## 6. 版本与回滚

每次生成记录：

- `style_id`
- `knowledge_version`
- `knowledge_digest`
- `agent_id`
- `agent_config_version`
- `model_id`
- 输入资源版本与输出 artifact ID

远端知识变更应由本地源构建并发布。不要直接在控制台长期手改而不回写仓库，否则无法复现历史结果。
