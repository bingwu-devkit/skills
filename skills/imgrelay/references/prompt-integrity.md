# 提示词完整性

## 建立独立预期值

使用 Node.js 22.20+（与 CLI 相同），从**写入前的原始字符串**调用脚本导出的 `fingerprint(prompt)`，
保存预期摘要 JSON，再将同一字符串写入 UTF-8 提示词文件。不能读取已写出的提示词文件反推预期摘要，
也不能把 dry-run 的字段复制成预期值，否则无法发现写入阶段的损坏。

以下代码应在支持直接执行 JavaScript 的工具中运行，或保存为脚本后运行；不要拼接为 shell 命令。
将 `skillDir` 设为当前加载的 skill 绝对目录，`workDir` 设为本次临时工作目录，`prompt` 来自准备好的原文。

```js
const { writeFile } = await import('node:fs/promises')
const { join } = await import('node:path')
const { pathToFileURL } = await import('node:url')
const { fingerprint } = await import(
  pathToFileURL(join(skillDir, 'scripts/verify-preview.mjs')).href
)
const expected = fingerprint(prompt)
await writeFile(join(workDir, 'expected.json'), JSON.stringify(expected), 'utf8')
await writeFile(join(workDir, 'prompt.txt'), prompt, 'utf8')
```

摘要包含 `promptSha256`（UTF-8 SHA-256）、`promptCharacters`（UTF-16 code units，等于 JS String.length）
和 `promptUtf8Bytes`（UTF-8 字节数）。脚本不会去除空白或换行。

## 预览与核对

执行相同参数的 `imgrelay generate --prompt-file <路径> --dry-run --json`，将标准输出单独保存为
UTF-8 `preview.json`，不要混入标准错误的进度消息。以下脚本路径相对 skill 目录，实际调用时使用绝对路径：

```bash
node <skill目录>/scripts/verify-preview.mjs expected.json preview.json
```

脚本要求成功的 dry-run JSON，比较三个摘要字段，输出 JSON 差异，不打印提示词正文。
退出码：0 一致，1 摘要不一致，2 输入文件、JSON 结构或结果状态无效。
脚本只读取本地文件，不联网、不写文件、不发起生成。它不校验生成参数，仍需核对供应商、模型、
`parameters`、`outputDir`、`filename`、`overwrite` 和 `timeoutSeconds`。
正式生成沿用已核对的文件和参数，仅移除 `--dry-run`。同一个已核验请求在正式提交前，若其文件、
参数或依赖的配置发生变化，必须重新预览。批次中的下一份新提示词属于新请求，按主文的批次规则处理，
不因内容不同就重复预览；每份新提示词仍须从原始字符串建立独立预期摘要。

核验第一份正式结果时，将其标准输出保存为 UTF-8 JSON，使用同一预期摘要：

```bash
node <skill目录>/scripts/verify-preview.mjs expected.json result.json --result
```

`--result` 允许正式结果状态（包括失败和部分成功），但仍要求完整摘要；通过只代表提示词一致，
不代表生成成功。记录中的提示词全文可能被脱敏，不能用记录文本相等代替摘要核验。

## Windows 与精确输入

Windows 下优先使用文件入口，让 `.cmd/.bat` 只转发路径与选项。保留原文引号、换行、空行和首尾空白，
不将完整提示词拼成 shell 命令，也不使用 `JSON.stringify()` 充当 shell 引用。
CLI 严格读取 UTF-8，去除开头一个编码 BOM，其余文本原样保留；不要用会添加换行的文本管道替代精确文件输入。
若原文本身以 U+FEFF 开头，写入时须额外添加一个编码 BOM，使 CLI 去掉编码 BOM 后保留原文字符；
预期摘要始终从原始字符串计算。
