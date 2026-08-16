import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreationStatus, PublicationStatus, ReportStatus, TemplateStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_ADAPTER, StorageAdapter } from '../storage/storage.port';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class PublicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  async listMine(userId: string) {
    const token = await this.assets.createFileToken(userId);
    const creations = await this.prisma.creation.findMany({
      where: { userId, status: CreationStatus.DRAFT, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        outputAsset: true,
        template: { select: { name: true } },
        publication: true,
      },
      take: 50,
    });
    return creations.map((creation) => ({
      id: creation.id,
      templateId: creation.templateId,
      templateVersionId: creation.templateVersionId,
      templateName: creation.template.name,
      outputAssetId: creation.outputAssetId,
      outputFilePath: `/api/v1/assets/${creation.outputAssetId}/file?token=${encodeURIComponent(token)}`,
      createdAt: creation.createdAt,
      publication: creation.publication ? {
        id: creation.publication.id,
        status: creation.publication.status,
        reviewReasonCode: creation.publication.reviewReasonCode,
        publishedAt: creation.publication.publishedAt,
        withdrawnAt: creation.publication.withdrawnAt,
      } : null,
    }));
  }

  async submit(userId: string, creationId: string) {
    const creation = await this.prisma.creation.findFirst({
      where: { id: creationId, userId, status: CreationStatus.DRAFT, deletedAt: null },
      include: { publication: true },
    });
    if (!creation) throw new NotFoundException('Creation not found');
    if (creation.publication) {
      if (creation.publication.status === PublicationStatus.PENDING_REVIEW
        || creation.publication.status === PublicationStatus.PUBLISHED) {
        return creation.publication;
      }
      throw new ConflictException('This creation cannot be submitted again');
    }
    return this.prisma.publication.create({
      data: {
        creationId: creation.id,
        userId,
        templateId: creation.templateId,
        templateVersionId: creation.templateVersionId,
        status: PublicationStatus.PENDING_REVIEW,
      },
    });
  }

  async withdraw(userId: string, publicationId: string) {
    const publication = await this.prisma.publication.findFirst({
      where: { id: publicationId, userId },
    });
    if (!publication) throw new NotFoundException('Publication not found');
    if (publication.status !== PublicationStatus.PENDING_REVIEW
      && publication.status !== PublicationStatus.PUBLISHED) {
      throw new ConflictException('Publication cannot be withdrawn');
    }
    return this.prisma.publication.update({
      where: { id: publication.id },
      data: { status: PublicationStatus.WITHDRAWN, withdrawnAt: new Date() },
    });
  }

  async feed(sort: 'recommended' | 'latest') {
    const publications = await this.prisma.publication.findMany({
      where: { status: PublicationStatus.PUBLISHED },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: { systemNickname: true } },
        template: { select: { name: true } },
        creation: { select: { outputAssetId: true } },
        _count: { select: { likes: true, bookmarks: true, sourcedGenerationJobs: true } },
      },
      take: 100,
    });
    const mapped = publications.map((publication) => ({
      id: publication.id,
      templateId: publication.templateId,
      templateVersionId: publication.templateVersionId,
      templateName: publication.template.name,
      author: publication.user.systemNickname,
      imagePath: `/api/v1/publications/${publication.id}/image`,
      likes: publication._count.likes,
      bookmarks: publication._count.bookmarks,
      sameTemplateUses: publication._count.sourcedGenerationJobs,
      publishedAt: publication.publishedAt,
    }));
    if (sort === 'latest') return mapped.slice(0, 50);
    return mapped.sort((a, b) => {
      const ageA = (Date.now() - new Date(a.publishedAt ?? 0).getTime()) / 86_400_000;
      const ageB = (Date.now() - new Date(b.publishedAt ?? 0).getTime()) / 86_400_000;
      const scoreA = a.likes + a.bookmarks * 2 + a.sameTemplateUses * 3 - ageA * 0.08;
      const scoreB = b.likes + b.bookmarks * 2 + b.sameTemplateUses * 3 - ageB * 0.08;
      return scoreB - scoreA;
    }).slice(0, 50);
  }

  async detail(userId: string, publicationId: string) {
    const publication = await this.prisma.publication.findFirst({
      where: { id: publicationId, status: PublicationStatus.PUBLISHED },
      include: {
        user: { select: { systemNickname: true } },
        template: { select: { name: true, generationEnabled: true } },
        likes: { where: { userId }, select: { userId: true } },
        bookmarks: { where: { userId }, select: { userId: true } },
        _count: { select: { likes: true, bookmarks: true, sourcedGenerationJobs: true } },
      },
    });
    if (!publication) throw new NotFoundException('Publication not found');
    return {
      id: publication.id,
      templateId: publication.templateId,
      templateVersionId: publication.templateVersionId,
      templateName: publication.template.name,
      generationEnabled: publication.template.generationEnabled,
      author: publication.user.systemNickname,
      imagePath: `/api/v1/publications/${publication.id}/image`,
      liked: publication.likes.length > 0,
      bookmarked: publication.bookmarks.length > 0,
      likes: publication._count.likes,
      bookmarks: publication._count.bookmarks,
      sameTemplateUses: publication._count.sourcedGenerationJobs,
      publishedAt: publication.publishedAt,
    };
  }

  async like(userId: string, publicationId: string) {
    await this.requirePublished(publicationId);
    await this.prisma.workLike.upsert({
      where: { userId_publicationId: { userId, publicationId } },
      create: { userId, publicationId }, update: {},
    });
    return { liked: true };
  }

  async unlike(userId: string, publicationId: string) {
    await this.prisma.workLike.deleteMany({ where: { userId, publicationId } });
    return { liked: false };
  }

  async bookmark(userId: string, publicationId: string) {
    await this.requirePublished(publicationId);
    await this.prisma.workBookmark.upsert({
      where: { userId_publicationId: { userId, publicationId } },
      create: { userId, publicationId }, update: {},
    });
    return { bookmarked: true };
  }

  async unbookmark(userId: string, publicationId: string) {
    await this.prisma.workBookmark.deleteMany({ where: { userId, publicationId } });
    return { bookmarked: false };
  }

  async report(userId: string, publicationId: string, reasonCode: string) {
    await this.requirePublished(publicationId);
    const existing = await this.prisma.report.findFirst({ where: { reporterUserId: userId, publicationId } });
    if (existing) return existing;
    return this.prisma.report.create({
      data: { reporterUserId: userId, publicationId, reasonCode, status: ReportStatus.OPEN },
    });
  }

  async bookmarkTemplate(userId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({ where: { id: templateId, status: TemplateStatus.ACTIVE, deletedAt: null } });
    if (!template) throw new NotFoundException('Template not found');
    await this.prisma.templateBookmark.upsert({
      where: { userId_templateId: { userId, templateId } }, create: { userId, templateId }, update: {},
    });
    return { bookmarked: true };
  }

  async unbookmarkTemplate(userId: string, templateId: string) {
    await this.prisma.templateBookmark.deleteMany({ where: { userId, templateId } });
    return { bookmarked: false };
  }

  async bookmarks(userId: string) {
    const [works, templates] = await Promise.all([
      this.prisma.workBookmark.findMany({
        where: { userId, publication: { status: PublicationStatus.PUBLISHED } },
        orderBy: { createdAt: 'desc' },
        include: { publication: { include: { template: { select: { name: true } }, user: { select: { systemNickname: true } } } } },
      }),
      this.prisma.templateBookmark.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, include: { template: { select: { id: true, name: true, generationEnabled: true } } },
      }),
    ]);
    return {
      works: works.map(({ publication }) => ({
        id: publication.id, templateName: publication.template.name, author: publication.user.systemNickname,
        imagePath: `/api/v1/publications/${publication.id}/image`,
      })),
      templates: templates.map(({ template }) => template),
    };
  }

  private async requirePublished(publicationId: string) {
    const publication = await this.prisma.publication.findFirst({
      where: { id: publicationId, status: PublicationStatus.PUBLISHED }, select: { id: true },
    });
    if (!publication) throw new NotFoundException('Publication not found');
  }

  async getPublishedImage(publicationId: string) {
    const publication = await this.prisma.publication.findFirst({
      where: { id: publicationId, status: PublicationStatus.PUBLISHED },
      include: { creation: { include: { outputAsset: true } } },
    });
    if (!publication) throw new NotFoundException('Publication not found');
    return {
      asset: publication.creation.outputAsset,
      stream: await this.storage.get(publication.creation.outputAsset.storageKey),
    };
  }
}
