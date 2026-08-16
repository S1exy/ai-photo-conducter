import { Injectable, NotFoundException } from '@nestjs/common';
import { TemplateStatus, TemplateVersionStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const templates = await this.prisma.template.findMany({
      where: { status: TemplateStatus.ACTIVE, catalogVisible: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        versions: {
          where: { status: TemplateVersionStatus.PUBLISHED },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
    return templates.flatMap((template) => {
      const version = template.versions[0];
      return version ? [this.mapTemplate(template, version)] : [];
    });
  }

  async get(id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, status: TemplateStatus.ACTIVE, deletedAt: null },
      include: {
        versions: {
          where: { status: TemplateVersionStatus.PUBLISHED },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
    const version = template?.versions[0];
    if (!template || !version) throw new NotFoundException('Template not found');
    return this.mapTemplate(template, version);
  }

  private mapTemplate(template: { id: string; name: string; catalogVisible: boolean; generationEnabled: boolean }, version: {
    id: string;
    versionNumber: number;
    inputSchema: unknown;
    outputSpecs: unknown;
    renderConfig: unknown;
  }) {
    const render = version.renderConfig as Record<string, unknown>;
    const output = version.outputSpecs as Record<string, unknown>;
    return {
      id: template.id,
      name: template.name,
      versionId: version.id,
      versionNumber: version.versionNumber,
      usageCount: 0,
      catalogVisible: template.catalogVisible,
      generationEnabled: template.generationEnabled,
      inputCount: 1,
      ratios: Array.isArray(output.ratios) ? output.ratios : ['1:1'],
      artClass: typeof render.artClass === 'string' ? render.artClass : 'editorial',
    };
  }
}
