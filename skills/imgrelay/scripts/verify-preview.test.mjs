import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { fingerprint, verify } from './verify-preview.mjs'

test('module imports and fingerprints without process or Buffer globals', () => {
  const moduleUrl = new URL('./verify-preview.mjs', import.meta.url).href
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `globalThis.process = undefined;
       globalThis.Buffer = undefined;
       const { fingerprint } = await import(${JSON.stringify(moduleUrl)});
       console.log(JSON.stringify(fingerprint('中😀')));`,
    ],
    { encoding: 'utf8' },
  )
  assert.equal(child.status, 0, child.stderr)
  assert.deepEqual(JSON.parse(child.stdout), fingerprint('中😀'))
})

const preview = (prompt) => ({
  status: 'success',
  data: {
    ...fingerprint(prompt),
    dryRun: true,
    submissionStatus: 'not_submitted',
    willSubmitNetworkRequest: false,
  },
})

test('preserves Unicode, quotes, CRLF, blank lines and edge whitespace', () => {
  const prompt = '  中文😀 "quoted"\r\n\r\nend\t '
  assert.deepEqual(verify(fingerprint(prompt), preview(prompt)), { ok: true, differences: [] })
  assert.equal(fingerprint('中😀').promptCharacters, 3)
  assert.equal(fingerprint('中😀').promptUtf8Bytes, 7)
  assert.equal(
    fingerprint('abc').promptSha256,
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  for (const damaged of [prompt.trim(), prompt.replaceAll('\r\n', '\n'), `${prompt}\n`]) {
    assert.equal(verify(fingerprint(prompt), preview(damaged)).ok, false)
  }
  assert.equal(verify(fingerprint('cat'), preview('dog')).differences.length, 1)
})

test('rejects missing data and failed previews; result mode is explicit', () => {
  const expected = fingerprint('原文')
  for (const invalid of [
    null,
    { status: 'success', data: null },
    { status: 'error', data: expected },
  ]) {
    assert.throws(() => verify(expected, invalid))
  }
  const partial = { status: 'partial_success', data: expected }
  assert.throws(() => verify(expected, partial))
  assert.equal(verify(expected, partial, true).ok, true)
  assert.throws(() => verify(expected, preview('原文'), true))
  assert.throws(() => verify({}, preview('原文')))
})

test('CLI returns distinct exit codes without leaking malformed JSON', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'imgrelay-verify-'))
  const expectedPath = join(directory, 'expected.json')
  const actualPath = join(directory, 'preview.json')
  const script = fileURLToPath(new URL('./verify-preview.mjs', import.meta.url))
  const run = () =>
    spawnSync(process.execPath, [script, expectedPath, actualPath], { encoding: 'utf8' })
  try {
    await writeFile(expectedPath, JSON.stringify(fingerprint('原文😀')))
    await writeFile(actualPath, `\uFEFF${JSON.stringify(preview('原文😀'))}`)
    assert.equal(run().status, 0)
    await writeFile(actualPath, JSON.stringify(preview('原文😀\n')))
    const mismatch = run()
    assert.equal(mismatch.status, 1)
    assert.equal(JSON.parse(mismatch.stdout).ok, false)
    await writeFile(actualPath, '{"private prompt":SECRET}')
    const malformed = run()
    assert.equal(malformed.status, 2)
    assert.equal(malformed.stdout.includes('SECRET'), false)
    await writeFile(actualPath, Buffer.from([0xff]))
    assert.equal(run().status, 2)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
