import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildMarketplaceManifest, isDirectExecution, main, readPublishedSkillNames } from '../../scripts/generate-skill-groups.mjs';

const temporaryDirectories = [];

async function createFixture(config = { alpha: { category: 'development' } }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skills-groups-test-'));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, 'skills', 'alpha'), { recursive: true });
  await writeFile(path.join(root, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: Alpha skill\n---\n');
  await writeFile(path.join(root, 'skills.config.json'), JSON.stringify(config));
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('skill group manifest', () => {
  it('groups every published skill deterministically and includes a fallback group', () => {
    const config = { zeta: { category: 'diagramming' }, beta: { category: 'development' }, alpha: { category: 'development' } };
    const manifest = buildMarketplaceManifest(['zeta', 'gamma', 'beta', 'alpha', 'alpha'], config);
    expect(manifest.name).toBe('bingwu-skills');
    expect(manifest.owner).toEqual({ name: 'BINGWU2003' });
    expect(manifest.plugins).toEqual([
      { name: 'development', description: '开发工程', source: './', strict: false, skills: ['./skills/alpha', './skills/beta'] },
      { name: 'diagramming', description: '图表可视化', source: './', strict: false, skills: ['./skills/zeta'] },
      { name: 'other', description: '其他', source: './', strict: false, skills: ['./skills/gamma'] },
    ]);
    expect(buildMarketplaceManifest(['alpha', 'zeta', 'beta', 'gamma'], config)).toEqual(manifest);
    expect(buildMarketplaceManifest([], {}).plugins).toEqual([]);
    expect(() => buildMarketplaceManifest(['alpha'], { alpha: { category: 'wrong' } })).toThrow('category');
  });

  it('discovers only flat published skills and skips unrelated files, containers and sources', async () => {
    const root = await createFixture();
    await writeFile(path.join(root, 'skills', 'README.md'), 'not a skill');
    await mkdir(path.join(root, 'skills', 'container', 'nested'), { recursive: true });
    await writeFile(path.join(root, 'skills', 'container', 'nested', 'SKILL.md'), 'nested');
    await mkdir(path.join(root, 'sources', 'upstream'), { recursive: true });
    await writeFile(path.join(root, 'sources', 'upstream', 'SKILL.md'), 'upstream');
    expect(await readPublishedSkillNames(root)).toEqual(['alpha']);
  });

  it.each([
    ['---\ndescription: Alpha\n---\n', '名称不一致'],
    ['---\nname: different\ndescription: Alpha\n---\n', '名称不一致'],
    ['---\nname: alpha\n---\n', '缺少 description'],
    ['---\nname: alpha\ndescription: 42\n---\n', '缺少 description'],
    ['---\nname: alpha\ndescription: " "\n---\n', '缺少 description'],
  ])('rejects invalid skill frontmatter', async (source, message) => {
    const root = await createFixture();
    await writeFile(path.join(root, 'skills', 'alpha', 'SKILL.md'), source);
    await expect(readPublishedSkillNames(root)).rejects.toThrow(message);
  });

  it('rejects invalid directory names and propagates skill read failures', async () => {
    const root = await createFixture();
    await mkdir(path.join(root, 'skills', 'Invalid_Name'));
    await writeFile(path.join(root, 'skills', 'Invalid_Name', 'SKILL.md'), '---\nname: Invalid_Name\ndescription: Invalid\n---\n');
    await expect(readPublishedSkillNames(root)).rejects.toThrow('名称不一致或无效');
    await rm(path.join(root, 'skills', 'Invalid_Name'), { recursive: true });
    await rm(path.join(root, 'skills', 'alpha', 'SKILL.md'));
    await mkdir(path.join(root, 'skills', 'alpha', 'SKILL.md'));
    await expect(readPublishedSkillNames(root)).rejects.toMatchObject({ code: 'EISDIR' });
  });

  it('generates once, preserves unchanged content and mtime, and checks without writing', async () => {
    const root = await createFixture();
    const logger = { log: vi.fn() };
    const destination = path.join(root, '.claude-plugin', 'marketplace.json');
    await main([], { repoRoot: root, logger });
    const content = await readFile(destination, 'utf8');
    const before = await stat(destination);
    expect(JSON.parse(content).plugins[0].skills).toEqual(['./skills/alpha']);
    expect(content.endsWith('\n')).toBe(true);
    await main([], { repoRoot: root, logger });
    await main(['--check'], { repoRoot: root, logger });
    expect(await readFile(destination, 'utf8')).toBe(content);
    expect((await stat(destination)).mtimeMs).toBe(before.mtimeMs);
    await writeFile(destination, content.replaceAll('\n', '\r\n'));
    await main(['--check'], { repoRoot: root, logger });
    expect(await readFile(destination, 'utf8')).toContain('\r\n');
  });

  it('fails read-only checks for missing or stale manifests with a regeneration hint', async () => {
    const root = await createFixture();
    const logger = { log: vi.fn() };
    const destination = path.join(root, '.claude-plugin', 'marketplace.json');
    await expect(main(['--check'], { repoRoot: root, logger })).rejects.toThrow('pnpm run groups:generate');
    await expect(stat(path.dirname(destination))).rejects.toMatchObject({ code: 'ENOENT' });
    await main([], { repoRoot: root, logger });
    const original = await readFile(destination, 'utf8');
    await writeFile(path.join(root, 'skills.config.json'), '{"alpha":{"category":"productivity"}}');
    await expect(main(['--check'], { repoRoot: root, logger })).rejects.toThrow('已过期');
    expect(await readFile(destination, 'utf8')).toBe(original);
    await main([], { repoRoot: root, logger });
    expect(JSON.parse(await readFile(destination, 'utf8')).plugins[0].name).toBe('productivity');
  });

  it('propagates manifest read errors and rejects unknown arguments', async () => {
    const root = await createFixture();
    await mkdir(path.join(root, '.claude-plugin', 'marketplace.json'), { recursive: true });
    await expect(main([], { repoRoot: root })).rejects.toMatchObject({ code: 'EISDIR' });
    await expect(main(['--unknown'])).rejects.toThrow('不支持的参数');
  });

  it('checks the repository defaults and recognizes direct execution', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['--check']);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/分组清单已同步：\d+ 个分组，\d+ 个 Skill/));
    expect(isDirectExecution()).toBe(false);
    expect(isDirectExecution('')).toBe(false);
    expect(isDirectExecution(fileURLToPath(new URL('../../scripts/generate-skill-groups.mjs', import.meta.url)))).toBe(true);
  });
});
