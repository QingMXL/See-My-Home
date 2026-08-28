# See My Home — MVP

[English](./README.md) | **中文**

> **看见家的未来。**

一个面向业主的 Web SaaS MVP:在动工之前,先看懂布局、看见风格,或把一件家具的想法变成真实的样子。基于 Vite + React + TypeScript 构建。

界面自带 **EN / 中文切换**(默认英文)——使用顶部导航中的语言开关。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 生产构建
npm test         # 单元测试(Vitest)
```

## 已实现功能

| 模块 | 流程 |
|---|---|
| 首页 | Hero、三张 Template 卡片、使用流程、最近的设计 |
| 看懂我的布局(See My Layout) | 上传户型图(或示例图)→ AI 房间识别 → 通过标签库确认房间用途 → 生活方式标签 → 分阶段生成 → 家具化俯视户型图(设计 / 家具 / 动线 / 房间标签四种视图)、布局说明、关键决策、保存 / 分享 / 下载 / 试试风格化 |
| 看见我的风格(See My Style) | 房间照片 + 房型 → 设计模板选择(6 个模板,各带风格标签)→ 分阶段生成 → 效果图、设计说明、带快捷建议与版本缩略图的调整循环 |
| 定制我的家具(Make My Furniture) | 草图 + 灵感图 + 文字描述 → 产品级渲染 → 调整材质 / 尺寸 / 支脚 / 拉手 / 层板 → "就是它了" → 带尺寸的三视图与基础规格 |
| 我的设计(My Designs) | 按项目分组的已保存设计,localStorage 持久化 |
| 平台 | 中英文切换(持久化)、统一的页面切换动效、路由滚动复位 |

## 架构说明

- **Agent 层为模拟实现**:`src/lib/agents.ts` 模拟每个 Template 背后的 Agent(分阶段进度、支持 i18n 的预置结果)。将其内部替换为真实 Agent API 的 HTTP 调用即可,无需改动 UI 代码。
- 所有结果图均为**参数化 SVG**(`src/components/visuals/`)——家具化户型图、风格渲染图和家具图纸会响应用户的实际选择(房间标签、生活方式标签、模板色板、材质)。
- **国际化**:`src/i18n/` 中的轻量 key-based 字典——界面文案、生成内容(布局说明、设计说明、Agent 回复)与标签均已翻译;状态始终存储英文规范值。
- 状态管理:zustand(`src/store/useDesignStore.ts`);仅已保存的设计跨刷新持久化。
- 设计令牌见 `src/styles/tokens.css`(温暖高级的浅色主题)。

## 本 MVP 不包含

真实 AI 生成、账号体系、分享链接后端、价格页、灵感页、CAD/BIM 工具。
