![version](https://img.shields.io/badge/version-0.7.8-blue)

🌍 用其他语言阅读:  
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [Português](README.pt.md)

---

# Agile Board

**Agile Board** 是一个 [Obsidian](https://obsidian.md) 插件，可以将你的笔记转换为可视化看板。  
每个布局基于一个模板（如艾森豪威尔矩阵），定义在一个 24×24 的网格上。  
各个部分显示为可编辑的框（“boxes”）：你可以在其中书写、插入任务、Dataview/Tasks 查询等。

**注意**: 内容始终以经典 Markdown 格式保存在 `#` 标题下，确保与所有笔记兼容。

---

## 🎯 功能

将笔记转换为带有可编辑框的可视化仪表板。  
每个框表示一个部分（一级标题），支持：

- **丰富的 Markdown**: `[[链接]]`, `- [ ] 任务`, 格式化  
- **智能编辑**: 自动延续列表，可点击的复选框  
- **插件兼容性**: Dataview, Tasks 等  
- **实时预览**: 与 Obsidian 接近的渲染效果（有少量限制）  

## 🌍 多语言支持

**v0.7.7 新功能**: 完整国际化，支持 **自动语言检测**！

- 🇺🇸 **English** – 参考语言  
- 🇫🇷 **Français** – 完整翻译  
- 🇪🇸 **Español** – 完整翻译  
- 🇩🇪 **Deutsch** – 完整翻译  
- 🇵🇹 **Português** – 完整翻译  
- 🇨🇳 **中文 (简体)** – 完整翻译  

界面会根据 Obsidian 的语言设置自动适配。  
所有界面元素、设置、消息和提示信息已在 **96 个翻译键** 下全部翻译。

## ⚠️ 当前限制

看板模式使用的是简化版编辑器，不包含 Obsidian 的所有高级功能：

- **图片**: 使用 `![[image.png]]` 插入的图片不会在看板模式的框中显示  
- **链接提示**: 输入 `[[` 时，不会自动提示笔记（仍可手动输入完整链接）  
- **内联插件调用**: 内联 Dataview 查询 (`= this.file.name`) 或 Templater 命令 (`<% tp.date.now() %>`) 不会在框中执行  

**未来计划**: 集成 CodeMirror 6（Obsidian 的原生编辑器），以解决这些限制。  
如果你有 CM6 集成经验，欢迎贡献！

## 🔄 两种显示模式

**🏢 看板模式**: 带有实时预览的可编辑框网格  
**📄 普通模式**: 经典的 Obsidian Markdown 编辑  

通过工具栏图标在两种模式之间切换。

![Agile Board – Eisenhower Example](./agile-board-eisenhower.gif)

---

## 🚀 安装

### 选项 1 – 完整 Vault（推荐）

1. 下载 `Agile-Board-v0.7.7.zip` （包含插件和示例的 Obsidian Vault）  
2. 解压并直接在 Obsidian 中打开该文件夹  

### 选项 2 – 仅插件

1. 从 [GitHub releases](https://github.com/a198h/agile-board/releases) 下载  
2. 将 `agile-board` 文件夹复制到 `.obsidian/plugins/`  
3. 重启 Obsidian 并启用插件  
4. **插件已内置 5 个默认布局**  

### 选项 3 – BRAT (Beta Testing)

通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装以获取最新更新：

1. 安装并启用 BRAT 插件  
2. 添加 `a198h/agile-board` 作为 Beta 插件  
3. BRAT 会自动更新插件  

---

## 📝 使用方法

### 配置

要在笔记中启用某个布局，请在属性 (frontmatter) 中添加：

```yaml
---
agile-board: eisenhower
---
```

**默认提供的布局**：

- `eisenhower`: 4 象限重要/紧急矩阵  
- `swot`: 情境分析  
- `moscow`: 优先级排序 (Must/Should/Could/Won’t)  
- `effort_impact`: 根据投入与效果决定行动  
- `cornell`: 康奈尔笔记法  

工具栏中会显示 🏢 图标。点击切换到看板模式。

### 编辑

- **点击框** → 进入编辑模式  
- **智能列表**: 支持项目符号和编号列表  
- **复选框**: 点击勾选/取消勾选，自动同步  
- **查询**: Query, Dataview, Tasks  

---

## ⚙️ 插件设置

通过 **设置 → 社区插件 → Agile Board** 可以直接在 Obsidian 中管理布局。

![Agile Board – Config](./agile-board-customize-board.png)

### 📋 布局管理

可用的布局会在设置中自动列出。  
每个布局对应插件 `layouts` 文件夹中的一个 `.json` 文件（用户无需手动修改该文件夹）。

- **创建布局**: 点击 ➕ 按钮并输入名称  
- **编辑布局**: 点击 ✏️ 图标打开可视化编辑器  
- **复制布局**: 点击 📑 图标  
- **导出 / 导入**: 使用 ⬆️ 和 ⬇️ 图标分享或加载配置  
- **删除布局**: 点击 🗑️ 图标  

### 🎨 可视化编辑器

布局编辑器显示一个 **24×24 网格**，你可以在上面放置 **框**：

- **创建**: 点击并拖拽  
- **移动**: 拖动框体  
- **调整大小**: 使用圆形控制点  
- **重命名**: 在侧边面板修改标题  
- **删除**: 点击红色 “🗑️” 按钮  
- **全部清除**: 点击红色 “🗑️ Clear all boxes” 按钮  

每个框对应一个 **笔记部分**：一个 **一级标题** (`#`) 及其内容。

---

## ✨ 特性

- **自动同步**: 框中的更改会自动保存到 Markdown 文件  
- **自动生成部分**: 辅助创建缺失的部分  
- **插件兼容性**: Dataview、Tasks 和 Templater 基本可用（请报告 bug！）；其他插件待验证  

---

## 💡 灵感来源

该插件受到 [Obsidian-Templify](https://github.com/Quorafind/Obsidian-Templify) 的启发，基于将 Markdown 笔记转换为可视化布局的理念进行扩展。

---

## 📂 你的贡献很重要！

- **Bugs/问题**: [https://github.com/a198h/agile-board/issues](https://github.com/a198h/agile-board/issues)  
- **讨论**: [https://github.com/a198h/agile-board/discussions/8](https://github.com/a198h/agile-board/discussions/8)  

## 支持我
如果你觉得我的工作有用，可以在这里支持我：  
[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/a198h)
