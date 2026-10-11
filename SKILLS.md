# 可用 Skills

本目录汇总仓库当前可安装的 Skill。通用安装方法见
[`README.md`](README.md#快速开始)。

| Skill                                              | 用途                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`agent-git`](skills/agent-git/)                   | 使用 checkpoint、status、undo 和 squash 工作流，帮助 Agent 安全管理 Git 修改。        |
| [`design-site-icon`](skills/design-site-icon/)     | 为网站设计手写签名式线性 SVG 图标并接入项目，覆盖动态 favicon、明暗主题和小尺寸适配。 |
| [`drawio-skill`](skills/drawio-skill/)             | 创建 Draw.io 图表，并通过桌面版 CLI 导出 PNG、SVG、PDF 或 JPG。                       |
| [`excalidraw-diagram`](skills/excalidraw-diagram/) | 根据自然语言创建 Excalidraw 图表，并通过渲染检查迭代优化视觉效果。                    |
| [`excalidraw-diagram-generator`](skills/excalidraw-diagram-generator/) | 根据自然语言生成 Excalidraw 流程图、架构图和关系图。 |
| [`gitlab-url-guard`](skills/gitlab-url-guard/)     | 规范化并校验 MR、流水线、作业和提交链接，保留源分支并登记流水线成功后自动合并。       |
| [`grilling`](skills/grilling/)                     | 通过结构化的深入访谈，系统梳理计划、设计或决策中的关键问题。                          |
| [`ian-xiaohei-illustrations`](skills/ian-xiaohei-illustrations/) | 为中文文章规划并生成 Ian 小黑风格的 16:9 白底手绘正文配图。 |
| [`imgrelay`](skills/imgrelay/)                     | 通过本机 ImgRelay CLI 调用生图中转站，生成、保存并展示原图。                          |
| [`tdd`](skills/tdd/)                               | 通过红—绿循环按公共接口逐步开发，并确保测试聚焦可观察行为。                          |
| [`weekly-git-report`](skills/weekly-git-report/)   | 根据 Git 提交记录生成、整理或保存周报。                                               |

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
Skill 由 [Ian](https://github.com/helloianneo) 创建，随附示例图用于风格校准；
许可声明见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
