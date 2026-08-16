const templates = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    versionId: '10000000-0000-4000-8000-000000000001',
    name: '摄影与抽象编辑',
    usageCount: 126,
    inputCount: 1,
    ratios: ['1:1', '3:4', '9:16'],
    artClass: 'editorial',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    versionId: '10000000-0000-4000-8000-000000000002',
    name: '宠物奇遇',
    usageCount: 208,
    inputCount: 1,
    ratios: ['1:1', '3:4'],
    artClass: 'pet',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    versionId: '10000000-0000-4000-8000-000000000003',
    name: '未来城市',
    usageCount: 89,
    inputCount: 1,
    ratios: ['3:4', '9:16'],
    artClass: 'city',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    versionId: '10000000-0000-4000-8000-000000000004',
    name: '动感海报',
    usageCount: 162,
    inputCount: 1,
    ratios: ['3:4', '9:16'],
    artClass: 'poster',
  },
];

const works = [
  { id: 'work_1', templateId: '00000000-0000-4000-8000-000000000001', author: '创作者 0286', likes: 126, heightClass: 'tall' },
  { id: 'work_2', templateId: '00000000-0000-4000-8000-000000000002', author: '创作者 0118', likes: 208, heightClass: 'short' },
  { id: 'work_3', templateId: '00000000-0000-4000-8000-000000000003', author: '创作者 0472', likes: 89, heightClass: 'medium' },
  { id: 'work_4', templateId: '00000000-0000-4000-8000-000000000004', author: '创作者 0094', likes: 162, heightClass: 'tall' },
  { id: 'work_5', templateId: '00000000-0000-4000-8000-000000000001', author: '创作者 0311', likes: 74, heightClass: 'medium' },
  { id: 'work_6', templateId: '00000000-0000-4000-8000-000000000002', author: '创作者 0205', likes: 45, heightClass: 'short' },
].map((work) => ({
  ...work,
  template: templates.find((template) => template.id === work.templateId),
}));

function delay(value, milliseconds = 180) {
  return new Promise((resolve) => setTimeout(() => resolve(value), milliseconds));
}

module.exports = {
  getFeed() {
    return delay(works);
  },

  getTemplates() {
    return delay(templates);
  },

  getTemplate(id) {
    return delay(templates.find((template) => template.id === id) || templates[0]);
  },

  createGeneration({ template, inputPath, aspectRatio }) {
    const task = {
      id: `mock_${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      inputPath,
      aspectRatio,
      status: 'queued',
      createdAt: Date.now(),
    };
    return delay(task, 300);
  },
};
