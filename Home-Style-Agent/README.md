# Home Style Agent

Home Style Agent 是 See My Home 的独立审美渲染 Agent。它读取用户房间照片和明确选择的风格，通过服务端选择对应知识版本，生成保持原始空间结构的室内改造效果图。

当前首个风格：`Modern East｜摩登东方`。

## 目录职责

- `knowledge/modern-east/`：Modern East 的版本化知识源，包括设计规则、Prompt 组件、结构化 schema、研究出处和内部参考图。
- `agent/`：Home Style Agent 的长期行为规则。结构保护、工具调用和质量门禁属于这里，不属于某个风格知识库。
- `config/`：风格目录及服务端知识绑定示例。真实 ZooWork ID 不提交到仓库，也不发送给浏览器。
- `contracts/`：UI、应用后端与 Style Runtime 之间的请求/响应契约。

## 运行时边界

```text
See My Home UI
  -> application backend
     -> Home Style Runtime
        -> immutable/editable scope analysis
        -> server-side style registry
        -> selected style knowledge
        -> prompt compilation
        -> ZooWork Home Style Agent + image generation model
        -> structural QA + style QA
     -> published result
```

浏览器只发送 `style_id: "modern_east"`。浏览器不得发送或读取 ZooWork Agent ID、知识库 ID、API key，也不能任意选择服务端知识资源。

## ZooWork 知识接入现状

本项目当前使用的 `@zoowork-ai/sdk` 版本为 `0.5.0`。已检查本地 SDK 类型和项目保存的 ZooWork 官方文档快照：这个版本没有公开的 Knowledge Base / RAG resource、知识库挂载字段或按 ID 检索接口。

因此当前可验证的部署方式是：

1. 以本目录为唯一知识源；
2. 构建时只提取生产所需的文字规则和 Prompt 组件；
3. 打包成 ZooWork 私有 Skill 并挂到 Home Style Agent，或由应用后端按请求注入经过裁剪的知识片段；
4. 不把 `reference-images/` 上传到运行时包。

如果 ZooWork 控制台已经提供一个独立的知识库 ID，需要先确认它对应的产品/API 契约，再增加适配器。可以把该 ID 提供给项目，但不要提供 API key；ID 最终只保存在服务端环境变量或密钥配置中。

当前 UI 接入已使用独立的 `/api/home-style` 路由，因此可以和已有 `/api/home-layout` 同时运行而不共享 Agent Session。

详见 [ARCHITECTURE.md](ARCHITECTURE.md) 和 [RUNTIME.md](RUNTIME.md)。
