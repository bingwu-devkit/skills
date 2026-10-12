#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

import { getSkillCategory, skillCategories } from './skill-categories.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), '..');

export async function readPublishedSkillNames(repoRoot) {
  const skillsRoot = path.join(repoRoot, 'skills');
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let source;
    try {
      source = await readFile(path.join(skillsRoot, entry.name, 'SKILL.md'), 'utf8');
    }
    catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const { data } = matter(source);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || data.name !== entry.name) {
      throw new Error(`Skill 名称不一致或无效：skills/${entry.name}/SKILL.md 声明为 ${data.name ?? '空'}`);
    }
    if (typeof data.description !== 'string' || !data.description.trim()) {
      throw new Error(`Skill 缺少 description：${entry.name}`);
    }
    names.push(entry.name);
  }
  return names.sort();
}

export function buildMarketplaceManifest(skillNames, config) {
  const grouped = new Map(skillCategories.map(category => [category.id, []]));
  for (const name of [...new Set(skillNames)].sort()) {
    const category = getSkillCategory(name, config[name]);
    grouped.get(category.id).push(`./skills/${name}`);
  }
  return {
    name: 'bingwu-skills',
    owner: { name: 'BINGWU2003' },
    plugins: skillCategories
      .filter(category => grouped.get(category.id).length > 0)
      .map(category => ({
        name: category.id,
        description: category.label,
        source: './',
        strict: false,
        skills: grouped.get(category.id),
      })),
  };
}

export async function main(args = process.argv.slice(2), options = {}) {
  const unknownArgument = args.find(argument => argument !== '--check');
  if (unknownArgument) throw new Error(`不支持的参数：${unknownArgument}`);
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const logger = options.logger ?? console;
  const [skillNames, configSource] = await Promise.all([
    readPublishedSkillNames(repoRoot),
    readFile(path.join(repoRoot, 'skills.config.json'), 'utf8'),
  ]);
  const manifest = buildMarketplaceManifest(skillNames, JSON.parse(configSource));
  const expected = `${JSON.stringify(manifest, null, 2)}\n`;
  const destination = path.join(repoRoot, '.claude-plugin', 'marketplace.json');
  let current = null;
  try {
    current = (await readFile(destination, 'utf8')).replaceAll('\r\n', '\n');
  }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (args.includes('--check')) {
    if (current !== expected) {
      throw new Error('分组清单缺失或已过期，请运行 pnpm run groups:generate，并提交 .claude-plugin/marketplace.json。');
    }
    logger.log(`分组清单已同步：${manifest.plugins.length} 个分组，${skillNames.length} 个 Skill。`);
    return;
  }

  if (current !== expected) {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, expected, 'utf8');
  }
  logger.log(`已生成 ${manifest.plugins.length} 个分组，包含 ${skillNames.length} 个 Skill。`);
}

export function isDirectExecution(argvPath = process.argv[1]) {
  return Boolean(argvPath) && path.resolve(argvPath) === path.resolve(scriptPath);
}

/* v8 ignore start -- CLI bootstrap is covered through exported main() */
if (isDirectExecution()) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
/* v8 ignore stop */
