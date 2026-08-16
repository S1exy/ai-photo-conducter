import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreationStatus, PublicationStatus } from '../generated/prisma/enums';
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

  async feed() {
    const publications = await this.prisma.publication.findMany({
      where: { status: PublicationStatus.PUBLISHED },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: { systemNickname: true } },
        template: { select: { name: true } },
        creation: { select: { outputAssetId: true } },
        _count: { select: { likes: true, bookmarks: true } },
      },
      take: 50,
    });
    return publications.map((publication) => ({
      id: publication.id,
      templateId: publication.templateId,
      templateVersionId: publication.templateVersionId,
      templateName: publication.template.name,
      author: publication.user.systemNickname,
      imagePath: `/api/v1/publications/${publication.id}/image`,
      likes: publication._count.likes,
      bookmarks: publication._count.bookmarks,
      publishedAt: publication.publishedAt,
    }));
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
