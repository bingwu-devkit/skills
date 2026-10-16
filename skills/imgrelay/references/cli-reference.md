# CLI 调用参考

按需查阅命令和参数。示例中的 `relay`、`vendor-model` 和路径须替换为本次实际值。
本机版本支持的选项以命令帮助为准；本参考不替代主文的校验、等待和重试规则。

## 查询与诊断

```bash
imgrelay provider list --json
imgrelay provider show relay --json
imgrelay models --provider relay --json
imgrelay models --provider relay --refresh --json
imgrelay doctor --provider relay --json
```

- `list` 返回默认供应商、默认模型和凭据配置摘要；`show` 返回脱敏配置。
- `models` 可使用 15 分钟缓存，`--refresh` 强制刷新；查询可能联网并更新缓存，不发起生图。
- `doctor` 检查配置和模型接口连接，不能据此认定生成接口或全部生成参数可用。

## 生成调用

先按 [提示词完整性](prompt-integrity.md) 准备 UTF-8 文件和独立预期摘要。
本轮首次生成必须预览并校验；后续是否重新校验按主文规定执行。
下面两条命令是先后步骤，预览核验通过后才执行正式生成：

```bash
imgrelay generate --provider relay --model vendor-model --prompt-file ./prompt.txt --n 2 --output-dir ./images --filename cat.png --dry-run --json
imgrelay generate --provider relay --model vendor-model --prompt-file ./prompt.txt --n 2 --output-dir ./images --filename cat.png --json
```

| 选项                                | 语义                                                              |
| ----------------------------------- | ----------------------------------------------------------------- |
| `--prompt-file <路径>`              | 从 UTF-8 文件读取提示词                                           |
| `--prompt-stdin`                    | 从标准输入读取；与 `--prompt-file` 互斥，Windows 优先使用文件     |
| `--provider <名称>`、`--model <ID>` | 仅覆盖本次供应商或模型，不修改持久配置                            |
| `--size <尺寸>`                     | 按模型能力填写，例如 `auto` 或 `1024x1024`，不保证所有模型都接受  |
| `--n <数量>`                        | 本次请求数量，CLI 不自动拆单；以模型和供应商限制为准              |
| `--quality <质量>`                  | 请求质量，取值以模型能力为准                                      |
| `--output-format <格式>`            | 请求图片格式；实际保存格式以返回图片为准                          |
| `--output-dir <目录>`               | 默认当前工作目录的 `output/imagegen/`，相对路径以当前工作目录解析 |
| `--filename <名称>`                 | 普通文件名，不含目录；多图追加序号，扩展名按实际格式确定          |
| `--overwrite`                       | 允许覆盖，仅在用户要求覆盖时使用                                  |
| `--timeout <秒数>`                  | 本次生成等待时间；未指定时沿用供应商设置，初始默认 600 秒         |
| `--dry-run`                         | 离线预览，无需密钥，不发起生成、不写记录                          |
| `--json`                            | 标准输出一个最终 JSON；进度走标准错误，同时禁用交互输入           |

未指定参数沿用 CLI 和供应商默认配置。不要根据输出文件名推断最终路径，使用 `data.images[].path`。
结果字段、部分成功与退出码见 [结果与错误处理](result-handling.md)。

## 修改持久配置

仅在用户要求配置变更时使用本节；单次生图使用生成命令的覆盖参数。
添加或更新密钥时，引导用户在交互终端执行，不带 `--json`，密钥由隐藏输入提供：

```bash
imgrelay provider add relay --default
imgrelay provider edit relay
```

不读取密钥文件，不在聊天或命令参数中传递密钥。以下为互相独立的配置示例，只执行用户要求的变更：

```bash
imgrelay provider use relay --json
imgrelay provider edit relay --model vendor-model --json
imgrelay provider edit relay --size auto --n 1 --quality high --output-format png --json
imgrelay provider edit relay --timeout 1200 --json
```

供应商要求自定义端点或返回格式时：

```bash
imgrelay provider edit relay --base-url https://relay.example/v1 --generation-path /render --models-path /catalog --json
imgrelay provider edit relay --response-format b64_json --json
```

`--response-format` 是供应商配置选项，支持 `url` 或 `b64_json`，不是 `generate` 的命令行选项。
地址和端点按供应商说明填写，不自行猜测。

用户要求配置模型参数限制时，用 `--capabilities-file` 导入 JSON。例如供应商明确限制单次一张：

```json
{
  "vendor-model": {
    "parameters": {
      "n": { "max": 1 }
    }
  }
}
```

```bash
imgrelay provider edit relay --capabilities-file ./capabilities.json --json
```

可限制 `size`、`n`、`quality`、`outputFormat`、`responseFormat`，使用 `supported`、`values`、`min`、`max`。
限制必须来自供应商提供的能力信息，不为绕过参数报错编造配置。

仅当用户明确要求清除密钥或删除供应商时，分别使用：

```bash
imgrelay provider edit relay --clear-key --json
imgrelay provider remove relay --json
```

## 版本与帮助

```bash
imgrelay --version
imgrelay --help --json
imgrelay generate --help --json
imgrelay provider edit --help --json
```

旧版本缺少必要选项时说明需升级，不猜测兼容调用。`--prompt` 已移除，使用文件或标准输入入口。
