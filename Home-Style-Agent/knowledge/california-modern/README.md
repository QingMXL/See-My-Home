# California Modern｜加州现代知识库

版本：`v0.1-research`
更新时间：2026-09-10
适用市场：美国住宅室内 AI 改造
内部 ID：`california_modern`

这是一套供 See My Home Style Agent 使用的、模型无关的审美知识库。它将成熟的 California modernism、California casual 与温暖的收藏式住宅语言整理成可检索规则。

## 文件结构

- [california-modern-knowledge-base.md](california-modern-knowledge-base.md)：风格定义、设计语法、标签、材质、色彩、房间规则和评估标准。
- [prompts/california-modern-prompts.md](prompts/california-modern-prompts.md)：英文 Prompt 组件与拼接协议。
- [schema/california-modern.v1.yaml](schema/california-modern.v1.yaml)：供 Agent/RAG 使用的结构化规则。
- [sources/source-notes.md](sources/source-notes.md)：研究案例、证据权重和不采用项。
- [reference-images/INDEX.md](reference-images/INDEX.md)：内部参考图候选页与授权状态。

## 使用原则

1. 前端显示 `California Modern`；不显示设计师或事务所名称。
2. 默认 profile 是 `sunlit-casual`，适用于美国普通住宅、旧房和公寓。
3. 风格的核心是光、自然材质、舒适尺度与室内外关联，不是海滩主题或农舍造型。
4. 参考图在授权策略确认前仅记录来源，不进入生产生成链路。
5. 房屋结构与相机保持由 Agent/图像编辑管线执行；本知识库提供必须遵守的语义边界。
