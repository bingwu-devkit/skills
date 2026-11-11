---
name: can-i-publish
description: 使用 can-i-publish CLI 检查 npm 包名、组织名及 scoped 包名的可用性，识别占用和相似度限制，并查找替代名称。当用户需要选择或验证 npm 名称、批量检查候选名或排查包名相似度阻止时使用。
---

# npm 包名检查

使用 `can-i-publish` 检查名称，并依据每个结果的 `status` 和检查范围给出结论。此工具固定查询公共 npm registry，不支持指定私有 registry。

## 选择命令

统一使用 `npx -y can-i-publish` 调用 CLI；`-y` 自动确认 npx 运行所需的安装提示，无需全局安装。

按用户任务选择参数：

```bash
# 单个名称；即使只有一个名称，JSON 仍为数组
npx -y can-i-publish my-package --json

# 批量检查；对 scoped 名称加引号以兼容 PowerShell
npx -y can-i-publish my-tool my-lib '@my-org/my-package' --json

# 组织名；与 @my-org/my-package 的包名检查不同
npx -y can-i-publish '@my-org' --json

# 帮助和版本
npx -y can-i-publish --help
npx -y can-i-publish -v
```

保留用户提供的候选名称，不擅自改大小写或删除 scope。名称不符合规则时，先报告 `invalid`，再按用户意图提出修改建议。通常的包名应为小写、长度不超过 214 个字符；以实际 CLI 结果为准。

## 读取检查结果

默认使用 `--json`（`-j`），解析标准输出中的结果数组。每项包含 `name`、`status`，并可能包含 `reason`、`similarTo`、`isOrganization`。不要假设可选字段一定存在。

| `status` | 判断与后续处理 |
|---|---|
| `available` | 本次检查未发现名称阻止；结合 `reason` 说明相似度是否完成，不能保证最终发布成功。 |
| `taken` | 名称已占用或被 CLI 保守判为不可用；不能直接用于新包。 |
| `squatted` | 名称已经存在，只是被启发式识别为疑似占位包；并非可自由注册，也不表示拥有发布权限。 |
| `blocked` | 被 npm 相似度过滤器阻止；有 `similarTo` 时列出相似包，并按需寻找替代名称。 |
| `invalid` | 名称不符合 CLI 校验规则；展示 `reason`。 |

退出码 `0` 表示所有结果都是 `available` 或 `squatted`；`1` 表示至少一个结果为 `taken`、`blocked` 或 `invalid`。**退出码为 `1` 时仍需读取 JSON 并逐项报告，不能丢弃整批结果；退出码为 `0` 也不能作为可发布的充分条件。** 不要使用 `npx -y can-i-publish ... && npm publish` 作为可靠的发布门禁。

组织结果带有 `isOrganization: true`，仅反映 CLI 对公开组织包列表的判断；空组织与未注册组织可能得到相同结果，不能据此保证组织名可注册。`@scope/package` 检查的是包名，不证明用户拥有 scope 或发布权限。

## 查找替代名称

使用 `--suggest`（`-s`）单独运行文本输出模式：

```bash
npx -y can-i-publish dxkit --suggest
```

**不要使用 `--json --suggest` 获取建议：当前实现进入 JSON 分支后不会生成建议。** 文本模式最多显示三个候选；原名称不可用时，即使找到了候选，退出码仍可能为 `1`。

如果用户需要结构化的建议结果，先从文本输出中提取候选，再用 `--json` 批量复查这些候选，读取其各自的 `reason`。文本建议行只显示名称和 `available`，不会显示每个候选的检查限制。不要把候选存在与否当成原名称可用的证明；找不到时如实说明。

## 凭据与结论范围

CLI 优先读取 `NPM_TOKEN`，其次读取用户主目录 `.npmrc` 中的 `//registry.npmjs.org/:_authToken=`。当前实现不读取项目 `.npmrc` 或 `NODE_AUTH_TOKEN`；不要为检查打印或回传凭据。

当普通包名在 registry 中未注册且检测到凭据时，CLI 会向 registry 发送带鉴权的 **PUT 发布探测请求**，以测试相似度过滤器；这并非纯只读查询。按当前任务允许的网络操作范围执行；如果仅允许只读请求，应在不含凭据、也无法读取真实用户 `.npmrc` 的隔离环境中运行，并明确未验证相似度。

没有凭据或探测请求失败时，名称仍可能得到 `available`，并在 `reason` 中提示 `npm login`。此时应说“registry 中未发现占用，相似度未完成检查”，而非“已确认可以发布”。即使没有该提示，CLI 也不会全面验证凭据有效性、scope 权限、二次验证等发布条件。

名称检查不代表获准执行 `npm login`、写入凭据、修改项目包名或执行 `npm publish`；这些操作需要用户任务本身已有授权。回答时列出各名称的状态、必要的原因和检查限制，语言跟随用户。
