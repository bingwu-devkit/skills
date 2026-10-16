import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function fingerprint(prompt) {
  if (typeof prompt !== 'string') throw new Error('prompt 必须是原始字符串')
  return {
    promptSha256: createHash('sha256').update(prompt, 'utf8').digest('hex'),
    promptCharacters: prompt.length,
    promptUtf8Bytes: Buffer.byteLength(prompt, 'utf8'),
  }
}

function validateFingerprint(value) {
  if (
    !value ||
    typeof value.promptSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.promptSha256) ||
    !Number.isSafeInteger(value.promptCharacters) ||
    value.promptCharacters < 0 ||
    !Number.isSafeInteger(value.promptUtf8Bytes) ||
    value.promptUtf8Bytes < 0
  ) {
    throw new Error('缺少有效的提示词摘要字段')
  }
}

export function verify(expected, envelope, resultMode = false) {
  validateFingerprint(expected)
  const data = envelope?.data
  if (resultMode) {
    if (
      !['success', 'partial_success', 'error', 'unknown', 'interrupted'].includes(
        envelope?.status,
      ) ||
      data?.dryRun === true
    ) {
      throw new Error('需要正式生成结果 JSON')
    }
  } else if (
    envelope?.status !== 'success' ||
    data?.dryRun !== true ||
    data?.submissionStatus !== 'not_submitted' ||
    data?.willSubmitNetworkRequest !== false
  ) {
    throw new Error('需要成功的 dry-run JSON')
  }
  validateFingerprint(data)
  const differences = Object.keys(fingerprint('')).flatMap((field) =>
    expected[field] === data[field]
      ? []
      : [{ field, expected: expected[field], actual: data[field] }],
  )
  return { ok: differences.length === 0, differences }
}

async function readJson(path) {
  const bytes = await readFile(path)
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

async function main() {
  try {
    const [expectedPath, actualPath, mode, ...extra] = process.argv.slice(2)
    if (
      !expectedPath ||
      !actualPath ||
      (mode !== undefined && mode !== '--result') ||
      extra.length
    ) {
      throw new Error('用法: node verify-preview.mjs expected.json preview.json [--result]')
    }
    const expected = await readJson(expectedPath)
    const actual = await readJson(actualPath)
    const result = verify(expected, actual, mode === '--result')
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.ok ? 0 : 1
  } catch (error) {
    // 不回显 JSON 解析器的原文片段，避免泄露提示词或其他响应内容。
    const message =
      error instanceof SyntaxError || error instanceof TypeError
        ? '输入不是有效的 UTF-8 JSON'
        : error.message
    process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`)
    process.exitCode = 2
  }
}

if (
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main()
}
