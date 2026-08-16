import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { TemplateStatus, TemplateVersionStatus } from '../src/generated/prisma/enums';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const templates = [
  { suffix: '1', name: '摄影与抽象编辑', artClass: 'editorial', ratios: ['1:1', '3:4', '9:16'] },
  { suffix: '2', name: '宠物奇遇', artClass: 'pet', ratios: ['1:1', '3:4'] },
  { suffix: '3', name: '未来城市', artClass: 'city', ratios: ['3:4', '9:16'] },
  { suffix: '4', name: '动感海报', artClass: 'poster', ratios: ['3:4', '9:16'] },
];

async function main() {
  for (const [index, item] of templates.entries()) {
    const templateId = `00000000-0000-4000-8000-00000000000${item.suffix}`;
    const versionId = `10000000-0000-4000-8000-00000000000${item.suffix}`;
    const inputSchema = { count: 1, type: 'image' };
    const renderConfig = { artClass: item.artClass };
    const modelConfig = { provider: 'mock', adapter: 'image-to-image' };
    const outputSpecs = { ratios: item.ratios, imagesPerJob: 1 };
    const checksum = createHash('sha256')
      .update(JSON.stringify({ inputSchema, renderConfig, modelConfig, outputSpecs }))
      .digest('hex');

    await prisma.template.upsert({
      where: { id: templateId },
      create: {
        id: templateId,
        name: item.name,
        status: TemplateStatus.ACTIVE,
        sortOrder: index + 1,
      },
      update: {
        name: item.name,
        status: TemplateStatus.ACTIVE,
        sortOrder: index + 1,
      },
    });

    await prisma.templateVersion.upsert({
      where: { id: versionId },
      create: {
        id: versionId,
        templateId,
        versionNumber: 1,
        inputSchema,
        renderConfig,
        modelConfig,
        outputSpecs,
        checksum,
        status: TemplateVersionStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      update: {
        inputSchema,
        renderConfig,
        modelConfig,
        outputSpecs,
        checksum,
        status: TemplateVersionStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
