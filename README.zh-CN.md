![version](https://img.shields.io/badge/version-0.9.2-blue) ![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A50.15.0-7C3AED) ![1.13+](https://img.shields.io/badge/1.13%2B-compatible-brightgreen) ![Desktop only](https://img.shields.io/badge/%E5%B9%B3%E5%8F%B0-%E4%BB%85%E6%A1%8C%E9%9D%A2%E7%AB%AF-lightgrey)

🌍 用其他语言阅读:
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português](README.pt.md) | [Русский](README.ru.md)

---

# Agile Board

**Agile Board** 将您的 Obsidian 笔记转换为交互式可视化看板。您的章节将变为网格上排列的可编辑框架——同时在底层始终保持有效、可移植的 Markdown 格式。

![Agile Board – Eisenhower 示例](./agile-board-eisenhower.gif)

---

## 🆕 最新动态

### v0.9.2 — 看板打印功能改进

- **网格缩放**：框架自适应纸张大小（纵向或横向），不再溢出
- **页眉和页脚**：文件标题显示在顶部，插件版本显示在右下角
- **标注块**：打印时样式正确
- **Obsidian Bases**：卡片和表格可干净打印——工具栏已移除，日期格式化为 `DD/MM/YYYY HH:MM:SS`，属性标签正常显示（冗余的 "name" 除外）
- **任务列表**：复选框保留，并有适当间距

### v0.9.1 — Obsidian 1.13.0 兼容性修复
Obsidian v1.13.0 的 Chromium 升级导致布局编辑器中的调整大小手柄失效。此补丁在所有受支持的版本上完全恢复了可视化编辑器的功能。

### v0.9.0 — 弹出式编辑器

> 此前，编辑框架需要将整个笔记切换到编辑模式，这使得在保持看板可见的同时进行写作变得困难。

**现在您可以双击任意框架标题，在专用窗口中打开其内容**，享受完整的 Obsidian Live Preview。窗口关闭时内容会自动同步回来。已锁定的框架无法在弹出窗口中打开。

![Agile Board – 看板转 Markdown](./Agile-Board-Board-to-Markdown_c.gif)

---

## 🎯 功能特性

### 看板与编辑
- **两种显示模式**：在可视化看板（🏢）和经典 Markdown 编辑（📄）之间自由切换
- **可编辑框架**：点击任意框架，使用 CodeMirror 6 进入编辑模式
- **弹出式编辑器**：双击框架标题在独立窗口中编辑——在写作时保持看板可见
- **智能编辑**：列表和标注块自动续行，可点击复选框即时同步
- **丰富 Markdown**：`[[链接]]`、`- [ ] 任务`、格式化、代码块、水平线

### 框架自定义
- **框架锁定**：锁定框架以防止意外编辑——链接、嵌入内容和复选框仍可正常使用
- **字体大小**：在插件设置中调整所有框架的文字缩放（0.7× 至 1.5×）
- **自定义颜色**：为任意框架指定颜色——在看板视图中显示为着色标题栏和彩色边框

![Agile Board – 框架锁定](./Agile-Board-Lock-frame_c.gif)
![Agile Board – 字体大小](./Agile-Board-Font-Size-in-Board_c.gif)

### 嵌入内容与插件兼容性
- **图片**：`![[图片.png]]` 在看板预览中正确显示
- **笔记**：`![[其他笔记.md]]` 将笔记内容直接嵌入框架
- **Obsidian Bases**：`![[表格.base]]` 显示交互式数据库视图；使用 `![[表格.base#视图名称]]` 记住所选视图
- **Dataview & Tasks**：查询在框架内正常计算和更新
- **右键菜单与打印**：右键点击看板标签页获取所有标准 Obsidian 选项，以及直接打印看板

![Agile Board – 右键菜单](./Agile-Board-Menu_c.gif)
![Agile Board – 打印看板](./Agile-Board-Print-Board_c.gif)

---

## ⚠️ 已知限制

框架编辑器使用 CodeMirror 6，但并不完全复制 Obsidian 的所有编辑功能：

- **链接建议**：输入 `[[` 不会建议您的笔记——请手动输入完整链接
- **内联插件调用**：内联 Dataview 查询（`= this.file.name`）和 Templater 命令（`<% tp.date.now() %>`）在框架内不会执行
- **仅限桌面端**：看板在移动端不可用——您的笔记在移动端仍可作为标准 Markdown 正常查看

---

## 🚀 安装

**要求**：Obsidian 桌面版 ≥ 0.15.0。兼容 Obsidian 1.13.0（Catalyst）及更高版本。

### 选项 1 — BRAT（推荐）

[BRAT](https://github.com/TfTHacker/obsidian42-brat) 自动处理更新：

1. 安装并启用社区插件 **BRAT**
2. 在 BRAT 设置中添��� `a198h/agile-board`
3. BRAT 会自动安装并保持插件更新

### 选项 2 — 手动安装

1. 从 [最新 GitHub 发布页](https://github.com/a198h/agile-board/releases/latest) 下载 `main.js`、`manifest.json` 和 `styles.css`
2. 将三个文件复制到 `.obsidian/plugins/agile-board/`
3. 重启 Obsidian，在设置 → 第三方插件中启用 **Agile Board**

> **5 个默认布局已内置**于插件中——无需额外下载。

---

## 📝 快速入门

### 1. 在笔记上激活布局

在笔记的 frontmatter 中添加 `agile-board` 属性：

```yaml
---
agile-board: eisenhower
---
```

点击工具栏中的 🏢 图标切换到看板模式。

### 2. 可用布局

| 布局 | 描述 |
|---|---|
| `eisenhower` | 重要 / 紧急四象限矩阵 |
| `swot` | 优势、劣势、机会、威胁分析 |
| `moscow` | Must / Should / Could / Won't 优先级排序 |
| `effort_impact` | 按效果优先排列行动 |
| `cornell` | 主动笔记系统 |

### 3. 编辑框架

- **单击** → 编辑模式
- **双击标题** → 在弹出窗口中打开
- 更改会自动保存到 Markdown 文件

---

## ⚙️ 插件设置

打开**设置 → 第三方插件 → Agile Board** 管理布局和外观。

![Agile Board – 配置](./agile-board-customize-board.png)

### 布局管理

每个布局都是插件 `layouts/` 文件夹中的一个 `.json` 文件。在设置面板中：

| 操作 | 控件 |
|---|---|
| 创建 | ➕ 按钮——输入名称 |
| 编辑 | ✏️ 图标——打开可视化编辑器 |
| 复制 | 📑 图标 |
| 导出 / 导入 | ⬆️ / ⬇️ 图标——分享或加载配置 |
| 删除 | 🗑️ 图标 |

### 可视化布局编辑器

编辑器显示一个 **24×24 网格**，您在其上放置和调整 **box**（框架）大小：

- **创建**：在空白区域点击并拖动
- **移动**：拖动 box 重新定位
- **调整大小**：拖动 box 角和边上的圆形手柄
- **重命名**：在侧边面板中编辑标题
- **颜色**：在侧边面板中选择自定义颜色——点击**重置**恢复为调色板颜色
- **删除**：侧边面板中的 🗑️ 按钮
- **清除全部**：从布局中移除所有 box（需确认）

每个 box 对应笔记中的一个**一级标题**（`#`）及其后续内容。

---

## 🌍 多语言支持

界面自动适应您的 Obsidian 语言设置。所有 UI 元素、设置、消息和提示均以 **7 种语言**提供（96 个翻译键）：

| 语言 | 状态 |
|---|---|
| 🇺🇸 English | 参考语言 |
| ��🇷 Français | 完整 |
| 🇪🇸 Español | 完整 |
| 🇩🇪 Deutsch | 完整 |
| 🇵🇹 Português | 完整 |
| 🇨🇳 中文 (简体) | 完整 |
| 🇷🇺 Русский | 完整 |

---

## 💡 灵感来源

本插件受 [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) 启发，基于将 Markdown 笔记转换为可视化布局的理念构建。

---

## 📂 贡献与支持

- **错误报告与功能请求**：[GitHub Issues](https://github.com/a198h/agile-board/issues)
- **讨论**：[GitHub Discussions](https://github.com/a198h/agile-board/discussions/8)

如果您觉得此插件有用，欢迎支持其开发：

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
