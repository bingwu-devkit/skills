# TypeScript 代码示例

以下五组示例依次说明编码定义、映射类型、未知值、业务选项和契约测试。代码使用 TypeScript 4.9+；编码及文案是示例假设，不构成任何项目的接口契约。实际采用项目已有的定义形式、模块路径、国际化和测试工具，不因示例新增全局目录或重写现有校验。

## 1. 业务编码与派生类型

前提：示例契约已确认角色编码为 1、2、3。项目没有生成代码或其他权威定义可复用。

```ts
export const UserRole = {
  Administrator: 1,
  Member: 2,
  Assistant: 3,
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

// 已知请求值可受联合类型约束；这不是响应的运行时校验。
export type ChangeRoleRequest = { role: UserRole }
```

不同业务字段即使也使用 1、2、3，也应依据语义分别定义。数字编码是否转换为 URL 字符串由既有序列化规则决定，不为了共用一个类型改变协议。

## 2. 完整映射与部分映射

前提：所有已知角色都需要展示文案。展示模块导入上例的 `UserRole`，业务定义不反向导入展示模块。

```ts
export const userRoleLabels = {
  [UserRole.Administrator]: '管理员',
  [UserRole.Member]: '普通用户',
  [UserRole.Assistant]: '助理账号',
} satisfies Record<UserRole, string>
```

新增角色却漏配文案时，完整映射应产生类型错误。不要仅因响应可能包含未知编码，就扩大为 `Partial<Record<string, string>>`，丢失对已知成员的覆盖检查。

若示例业务只为管理员提供附加说明，其他角色没有说明是预期行为，可以使用部分映射：

```ts
export const roleDescriptions: Partial<Record<UserRole, string>> = {
  [UserRole.Administrator]: '可管理成员',
}

export function getRoleDescription(role: UserRole): string | undefined {
  return roleDescriptions[role]
}
```

这里使用类型注解让任意已知角色都可索引，结果包含 `undefined`。`satisfies` 检查约束但不会扩宽推断出的对象键，不能机械替换此注解。部分映射的缺失项不应被误报为未知角色。

图标、颜色和提示也可作为映射值的字段，字段类型沿用项目组件或主题系统；不要为示例另建一套视觉编码。国际化项目保存翻译键并在展示时翻译，避免模块初始化时固化语言。

## 3. 未知编码与缺省值

前提：示例响应契约允许任意数字编码及 `null`、`undefined`，当前产品明确使用“角色未提供”和“未知角色”两种提示。若实际 Schema 严格拒绝未知值，应沿用其行为。

```ts
const knownUserRoles: ReadonlySet<number> = new Set(Object.values(UserRole))

export function isUserRole(value: number): value is UserRole {
  return knownUserRoles.has(value)
}

export function getUserRoleLabel(role: number | null | undefined): string {
  if (role === null || role === undefined) return '角色未提供'
  if (!isUserRole(role)) return '未知角色'
  return userRoleLabels[role]
}
```

展示函数使用第二节的完整映射。类型守卫放在适合复用的领域或边界模块，展示函数放在展示层；不要为了凑成一个示例文件把 UI 依赖引入业务编码模块。

不要用 `role as UserRole` 跳过检查，也不要用 `role || UserRole.Member` 把缺省或未知值变成正常角色。字符串形式的数字是否接受取决于实际契约，不能顺手增加 `Number(role)` 兼容。

本例提示仅用于展示，不赋回 `role`，不进入请求参数。普通文本字段的缺省展示继续复用项目已有工具。

## 4. 展示映射与业务选项

前提：示例邀请流程仅允许选择普通用户和助理账号，顺序已确定；是否允许邀请助理由功能获得的权限决定。

```ts
export function getInviteRoleOptions(canInviteAssistant: boolean) {
  const roles: UserRole[] = [UserRole.Member]
  if (canInviteAssistant) roles.push(UserRole.Assistant)

  return roles.map((role) => ({
    value: role,
    label: userRoleLabels[role],
  }))
}
```

此函数属于邀请功能，静态文案来自共享映射。不要通过枚举全部成员自动提供管理员选项，也不要把数组索引作为提交编码。前端选项过滤不替代服务端权限校验。

## 5. 业务场景与契约断言

前提：以下使用 Vitest 风格，测试模块导入前三节定义（导入路径按项目补齐）。断言中的原始协议值来自独立确认的示例契约。

```ts
import { expect, it } from 'vitest'

it('为已知角色展示对应文案', () => {
  expect(getUserRoleLabel(UserRole.Member)).toBe('普通用户')
})

it('角色编码与协议一致', () => {
  expect(UserRole.Administrator).toBe(1)
  expect(UserRole.Member).toBe(2)
  expect(UserRole.Assistant).toBe(3)
})

it('区分未知角色和缺省角色', () => {
  expect(getUserRoleLabel(99)).toBe('未知角色')
  expect(getUserRoleLabel(0)).toBe('未知角色')
  expect(getUserRoleLabel(null)).toBe('角色未提供')
  expect(getUserRoleLabel(undefined)).toBe('角色未提供')
})
```

本例 0 是未知编码而不是空值；如果实际契约将 0 定义为合法成员，应正常展示。业务 Mock 使用具名值；编码契约断言保留原始数字，避免生产代码与测试同时引用被误改的枚举后一起通过。
