export const skillCategories = Object.freeze([
  { id: 'development', label: '开发工程' },
  { id: 'code-collaboration', label: '代码协作' },
  { id: 'diagramming', label: '图表可视化' },
  { id: 'visual-design', label: '视觉创作' },
  { id: 'productivity', label: '效率与思考' },
  { id: 'other', label: '其他' },
].map(category => Object.freeze(category)));

export function getSkillCategory(skillName, config = {}) {
  const id = config.category === undefined ? 'other' : config.category;
  const category = skillCategories.find(candidate => candidate.id === id);
  if (!category) {
    throw new Error(
      `${skillName} 的 category 无效：${String(id)}。请修改 skills.config.json，使用 ${skillCategories.map(candidate => candidate.id).join('、')}。`,
    );
  }
  return category;
}

export function countSkillCategories(skills) {
  return skillCategories
    .map(category => ({
      id: category.id,
      label: category.label,
      count: skills.filter(skill => skill.category === category.id).length,
    }))
    .filter(category => category.count > 0);
}
