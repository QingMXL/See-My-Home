# Maximal Luxe｜极繁奢华知识库

版本：`v0.1-research`
更新时间：2026-09-10
适用市场：美国住宅室内 AI 改造
内部 ID：`maximal_luxe`

这是一套供 See My Home Style Agent 使用的、模型无关的审美知识库。其情绪研究包含 1980s socialite glamour，但生产定义落在可居住的 contemporary Hollywood Regency 与 curated eclectic luxury，而不是影视布景复制。

## 文件结构

- [maximal-luxe-knowledge-base.md](maximal-luxe-knowledge-base.md)：风格定义、设计语法、标签、材质、色彩、房间规则和评估标准。
- [prompts/maximal-luxe-prompts.md](prompts/maximal-luxe-prompts.md)：英文 Prompt 组件与拼接协议。
- [schema/maximal-luxe.v1.yaml](schema/maximal-luxe.v1.yaml)：供 Agent/RAG 使用的结构化规则。
- [sources/source-notes.md](sources/source-notes.md)：影视情绪样本、住宅案例、证据权重和排除项。
- [reference-images/INDEX.md](reference-images/INDEX.md)：内部参考图候选页与授权状态。

## 使用原则

1. 前端显示 `Maximal Luxe`；不显示影视剧、角色或设计师名称。
2. 默认 profile 是 `edited-glamour`：有戏剧性，但住宅尺度、舒适度和秩序优先。
3. “极繁”指经过编辑的色彩、图案、收藏和材质层次，不等于把每个表面都装满。
4. 参考图在授权策略确认前只用于人工研究，不进入生产生成链路。
5. 影视布景中与角色叙事相关的自恋肖像、夜店感和极端紫金配色不是默认规则。
