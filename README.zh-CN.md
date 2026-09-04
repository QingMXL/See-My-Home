# See My Home

See My Home 是一个中英文住宅设计应用：共用一套 UI，但三个 Agent 按独立版本、独立契约和独立接口进行管理。

## 仓库结构

```text
See-My-Home-Web/       当前 React/Vite 网站
Home-Layout-Agent/     户型图识别与彩色布局生成
Home-Style-Agent/      房间照片风格设计与 Modern East 知识库
Home-Furniture-Agent/  为独立开发的家具 Agent 预留的接入区域
api/                   按 Agent 命名空间隔离的 Vercel 服务端适配层
agent-release.json     UI 当前兼容的 Agent 版本组合
docs/                  接入与部署说明
```

Home Layout 和 Home Style 已连接真实的 ZooWork Managed Agent。Furniture 目前仍是 UI 演示；在真实 Runtime 合并到 `Home-Furniture-Agent/` 之前，仓库不会把它标记为已完成。

## 隔离原则

- 每个 Agent 分别拥有目录、包版本、Runtime Contract、API 命名空间、Agent ID 环境变量、Skills、Schema 和测试。
- 浏览器只调用同域的 `/api/home-layout/*` 和 `/api/home-style/*`，不会获得 ZooWork API Key，也不会直接请求 ZooWork。
- 上传文件和生成图片使用私有 Vercel Blob；ZooWork 只获得短期签名读取地址。
- `agent-release.json` 固定一组经过兼容检查的版本。生产环境不能自动引用不断变化的 “latest” Agent。

多人或多个任务并行更新 Agent 前，请先阅读 [Agent 接入与发布规则](docs/AGENT-INTEGRATION.md)。

## 本地检查

需要 Node.js 20 或更高版本，以及 pnpm：

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

使用本地 ZooWork Runtime 联调当前 Vite UI：

```bash
pnpm --dir Home-Layout-Agent test:local
pnpm --dir Home-Style-Agent runtime
pnpm dev
```

本地密钥只能放在各 Agent 被 Git 忽略的 `.env` 中，不能提交到仓库。

## Vercel

仓库已经包含 Vite 生产构建和隔离的 Node Functions 配置。部署前，需要连接一个私有 Vercel Blob，并把 `.env.example` 中列出的变量配置到 Vercel。实际部署由仓库所有者自行完成。
