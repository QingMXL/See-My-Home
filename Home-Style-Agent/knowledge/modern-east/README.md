# Modern East｜摩登东方知识库

版本：`v0.1-research`  
更新时间：2026-09-04  
适用市场：美国住宅室内 AI 改造  
内部 ID：`modern_east`

这是一套供 See My Home Style Agent 使用的、模型无关的审美知识库。它定义“什么是 Modern East”，不负责判断承重结构，也不把生成图当作建筑事实。

## 文件结构

- [modern-east-knowledge-base.md](modern-east-knowledge-base.md)：风格定义、设计语法、标签、材质、色彩、房间规则和评估标准。
- [prompts/modern-east-prompts.md](prompts/modern-east-prompts.md)：英文 Prompt 组件与拼接协议。
- [schema/modern-east.v1.yaml](schema/modern-east.v1.yaml)：供 Agent/RAG 使用的结构化规则。
- [sources/source-notes.md](sources/source-notes.md)：研究范围、项目权重与证据说明。
- [reference-images/INDEX.md](reference-images/INDEX.md)：29 张内部参考图的来源、分类和标签。
- `reference-images/`：按客厅、卧室、餐厨、卫浴和细节归档的参考图。

## 使用原则

1. 前端显示 `Modern East`，不显示事务所名称。
2. 事务所和项目名称只用于研究溯源，不进入生产 Prompt。
3. 图片只用于内部人工理解与校对；未取得授权前，不用于训练、公开分发或作为第三方模型的生产参考图。
4. Agent 必须先识别房间与可编辑范围，再检索本知识库；禁止把整份文档原样塞入 Prompt。
5. 墙体、柱、梁、门窗、开口、固定设备位置和相机视角的保护由 Agent/图像编辑管线执行。
6. 本版本从高端住宅案例提炼设计语言；默认子风格 `quiet-poise` 已降低酒店化和超大豪宅尺度。

## 推荐调用顺序

```text
room analysis
  -> immutable/editable scope
  -> Modern East profile selection
  -> room recipe retrieval
  -> model-specific prompt compilation
  -> image edit
  -> structural QA + style QA
```

