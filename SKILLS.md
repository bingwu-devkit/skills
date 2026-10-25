# 可用 Skills

本目录汇总仓库当前可安装的 Skill。通用安装方法见
[`README.md`](README.md#快速开始)。

网站提供“全部、开发工程、仓库工作流、图表可视化、视觉创作、效率与思考、其他”分类筛选，可与搜索组合使用。
分类在 [`skills.config.json`](skills.config.json) 中统一维护；修改后运行
`pnpm run groups:generate` 更新安装菜单清单，维护方法见
[`README.md`](README.md#维护-skill-分类)。

| Skill | 用途 |
| --- | --- |
| [`agent-git`](skills/agent-git/) | 使用 checkpoint、status、undo 和 squash 工作流，帮助 Agent 安全管理 Git 修改。 |
| [`archify`](skills/archify/) | 创建可交互浏览和导出的架构、流程、时序、数据流及状态图。 |
| [`design-site-icon`](skills/design-site-icon/) | 为网站设计手写签名式线性 SVG 图标并接入项目，覆盖动态 favicon、明暗主题和小尺寸适配。 |
| [`drawio-skill`](skills/drawio-skill/) | 创建 Draw.io 图表，并通过桌面版 CLI 导出 PNG、SVG、PDF 或 JPG。 |
| [`excalidraw-diagram`](skills/excalidraw-diagram/) | 根据自然语言创建 Excalidraw 图表，并通过渲染检查迭代优化视觉效果。 |
| [`excalidraw-diagram-generator`](skills/excalidraw-diagram-generator/) | 根据自然语言生成 Excalidraw 流程图、架构图和关系图。 |
| [`gitlab-release-workflow`](skills/gitlab-release-workflow/) | 编排 GitLab MR、流水线、自动合并、部署授权和发布验收。 |
| [`gitlab-url-guard`](skills/gitlab-url-guard/) | 构造、规范化并校验 GitLab MR、流水线、作业和提交链接。 |
| [`grilling`](skills/grilling/) | 通过结构化的深入访谈，系统梳理计划、设计或决策中的关键问题。 |
| [`ian-xiaohei-illustrations`](skills/ian-xiaohei-illustrations/) | 为中文文章规划并生成 Ian 小黑风格的 16:9 白底手绘正文配图。 |
| [`imgrelay`](skills/imgrelay/) | 通过本机 ImgRelay CLI 调用生图中转站，生成、保存并展示原图。 |
| [`ip-as-logo`](skills/ip-as-logo/) | 创建简洁、拟人化的方形角色图标与 IP 形象候选。 |
| [`pr`](skills/pr/) | 编写包含可视化摘要、验证证据和合并风险说明的 PR 描述。 |
| [`show-me`](skills/show-me/) | 通过简洁图示、代码结构草图和 HTML 工具辅助理解。 |
| [`tdd`](skills/tdd/) | 通过红—绿循环按公共接口逐步开发，并确保测试聚焦可观察行为。 |
| [`weekly-git-report`](skills/weekly-git-report/) | 根据 Git 提交记录生成、整理或保存周报。 |

## 特殊安装与依赖

### `excalidraw-diagram`

预览渲染器依赖 `uv` 和 Playwright。安装 Skill 后可让 Agent 按随附的
[`README.md`](skills/excalidraw-diagram/README.md#setup) 完成首次配置。

### `drawio-skill`

导出图片时需要安装 draw.io 桌面版，并确保其 CLI 可调用；Graphviz 仅在使用
可选的自动布局功能时需要。

### `gitlab-url-guard`

链接构造、规范化和校验通过 Python 3 脚本运行；执行 GitLab MR 读写或回读校验时
还需要安装并认证 GitLab CLI（`glab`）。

### `imgrelay`

需要 Node.js 22.20+（22.x）或 24.x，并通过 `npm install -g imgrelay` 安装 CLI。
首次生图前运行 `imgrelay provider add <名称>`，配置中转站地址、API Key 和默认模型；
详见[上游配置说明](https://github.com/bingwu-devkit/imgrelay#2-配置中转站)。

### `ian-xiaohei-illustrations`

生成或编辑配图时需要运行环境提供内置 `image_gen` 工具；仅规划配图策略时无需生图工具。
Skill 由 [Ian](https://github.com/helloianneo) 创建，随附示例图用于风格校准。
