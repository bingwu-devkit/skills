import { describe, expect, it } from 'vitest';

import { countSkillCategories, getSkillCategory } from '../../scripts/skill-categories.mjs';

describe('skill categories', () => {
  it('resolves configured categories and defaults missing categories to other', () => {
    expect(getSkillCategory('alpha', { category: 'development' })).toEqual({ id: 'development', label: '开发工程' });
    expect(getSkillCategory('alpha')).toEqual({ id: 'other', label: '其他' });
    expect(getSkillCategory('alpha', { requirements: [] }).id).toBe('other');
    expect(getSkillCategory('alpha', { category: 'other' }).label).toBe('其他');
  });

  it.each(['unknown', '', null, 42, ['development']])('rejects invalid category %j with a configuration hint', (category) => {
    expect(() => getSkillCategory('alpha', { category })).toThrow(/alpha.*category.*skills.config.json/);
  });

  it('counts only present categories in display order', () => {
    expect(countSkillCategories([
      { category: 'other' },
      { category: 'diagramming' },
      { category: 'development' },
      { category: 'diagramming' },
    ])).toEqual([
      { id: 'development', label: '开发工程', count: 1 },
      { id: 'diagramming', label: '图表可视化', count: 2 },
      { id: 'other', label: '其他', count: 1 },
    ]);
    expect(countSkillCategories([])).toEqual([]);
  });
});
