---
name: imgrelay
description: 用户主动调用 $imgrelay 时，通过本机 ImgRelay CLI 调用第三方 OpenAI Images 兼容中转站生成、保存并展示原图，或查询 ImgRelay 配置与模型。
---

# ImgRelay

使用 `imgrelay` CLI 完成配置查询、鉴权、生成和保存，通过当前环境的图片展示工具呈现本地原图。
需要命令速查、参数语义，或用户要求修改供应商配置时，读取 [CLI 调用参考](references/cli-reference.md)。

## 理解需求与准备提示词

用户要求生成图片时，按其主题、用途和显式约束准备提示词。对于简短描述，可补足主体、
构图和适合用途的必要细节，不改变主题、文字内容或其他明确要求，也不固定艺术风格。
用户明确要求原样使用提示词时，保留原文，包括换行及首尾空白。

需求足以执行时直接生成，无需每次确认提示词。只有缺少会显著影响结果的关键信息时才提问。
用户只查询配置、模型或能力时，使用只读命令，不发起生成。

## 读取配置与选择供应商

运行 `imgrelay provider list --json` 获取供应商、默认模型和凭据是否已配置的摘要。
CLI 不存在时，说明安装命令 `npm install -g imgrelay`，待安装后继续。

使用用户指定的供应商和模型；未指定时沿用本机默认项。需要查看默认参数或能力覆盖时，
运行 `imgrelay provider show <名称> --json`。已有配置无需重新阅读供应商官网。
本次选择通过生成命令传递，不为单次生图修改持久配置。

- 没有供应商或缺少密钥：引导用户在交互终端运行 `imgrelay provider add <名称>` 或
  `imgrelay provider edit <名称>`，不带 `--json`。密钥由用户隐藏输入，不在聊天或命令参数中传递，
  不直接读取配置文件或 API Key。
- 用户未指定供应商且没有默认项：让用户选择本次供应商；要设置持久默认项时使用
  `imgrelay provider use <名称>`。
- 没有默认模型且用户未指定：可用 `imgrelay models --provider <名称> --json` 查询后让用户选择，
  也接受用户提供的模型 ID。未知模型或模型列表不可用不应阻止已明确指定模型的生成。

需要诊断时使用 `imgrelay doctor --provider <名称> --json`。模型接口检查成功只证明模型查询可用，
不能据此断言生成或全部参数已验证；无需每次生成前都运行诊断。

## 调用生成并等待结果

非交互查询和生成命令用 `--json` 获取机器可读结果。将准备好的原文写入 UTF-8 文件，用 `--prompt-file` 传递；
也可通过不改变字节的管道和 `--prompt-stdin` 输入。两者互斥，CLI 已移除 `--prompt`。
首次使用本机 CLI 时查看 `imgrelay generate --help --json`，确认这些入口及 `--dry-run` 可用；
旧版本缺少入口时说明需升级，不假定新增选项已经安装。

```bash
imgrelay generate --prompt-file ./prompt.txt --dry-run --json
imgrelay generate --prompt-file ./prompt.txt --json
imgrelay generate --provider relay --model vendor-model --prompt-file ./prompt.txt --n 2 --json
```

按需求使用 `--size`、`--n`、`--quality`、`--output-format`、`--output-dir`、`--filename` 和
`--timeout`；未指定的参数交由 CLI 与供应商默认配置决定。仅在用户要求覆盖已有文件时
加 `--overwrite`。默认输出目录是当前工作目录的 `output/imagegen/`。

本轮任务首次生成前，读取 [提示词完整性](references/prompt-integrity.md)，从写入前的原始字符串
建立预期摘要，用 `--dry-run --json` 和 `scripts/verify-preview.mjs` 离线校验，并核对供应商、模型、
生成参数、输出目录和文件名。预览成功不代表内容正确；不匹配时修正本地调用，不提交生成。
提示词写入方式、CLI 版本或参数构造方式变化后重新校验。批次中下一份新请求仅提示词内容不同时，
无需重新执行 dry-run，但仍须保留独立预期摘要；同一已核验请求在提交前被修改时须重新预览。
dry-run 不联网、不写记录，也无需密钥。

每批请求先完成并核验第一项正式结果的摘要及关键参数，再继续其余项；批次指本轮任务中
使用相同写入方式、CLI 版本和参数构造方式的一组请求。若摘要或参数不匹配，保留已有图片和记录，
停止尚未提交的同类调用，跟踪已提交请求，按下方失败处理规则决定是否重新生成。
用户要求逐张生成时，上一请求结束后才提交下一请求。

CLI 标准输出包含一个最终 JSON，进度在标准错误。生成默认可等待 600 秒；执行工具返回
“仍在运行”或会话 ID 时，继续等待同一个进程，直至结束。不要因此再次执行生成命令。

## 读取结果并展示原图

先读取最终 JSON，再结合进程退出码判断结果；非零退出码不等于没有图片。
`data` 可能为 `null` 或仅包含提交状态，先确认 `data.images` 为数组，再读取或统计图片。

展示已保存的 `data.images[].path`，按需说明实际宽高、格式、供应商 `data.provider`、
请求模型 `data.requestedModel` 和保存位置；存在 `data.recordPath` 时提供记录路径。
仅当 `data.reportedModel` 存在时说明上游报告模型，不据请求模型断言底层模型身份。
环境不支持展示时提供可访问的本地文件链接。

实际保存数量以 `data.images.length` 为准，`requestedCount` 和 `returnedCount` 分别表示请求数量
和上游返回条目数。上游少返回图片时说明数量差异，不自动补单。
不自动筛选、修图或裁剪原图；按用户要求使用结果，不因生图任务自行修改项目代码或替换产品图片。

## 处理失败与部分结果

遇到失败、部分成功或结果未知时，读取 [结果与错误处理](references/result-handling.md)。
先保留并展示已有图片，再结合提交状态判断下一步，不仅凭退出码或错误类别推断是否已提交。

- 明确 `submissionStatus: not_submitted` 时，可修正不改变用户意图的本地调用错误，在原授权范围内继续；
  同一修复无效时停止重复尝试，说明阻塞原因。用户主动中断后不自行恢复。
- 已提交或无法确定是否提交时，不自动重提；用户已明确授权的重试按其范围和次数执行，
  授权用尽后停止。缺少相应授权时，由用户决定是否发起新请求。
- 失败后不自行切换供应商或模型、降低参数、拆单或追加生成；保存失败不能靠重新生图恢复。
