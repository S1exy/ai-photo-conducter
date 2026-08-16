import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PublicationStatus, ReportStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listReviews(status: PublicationStatus = PublicationStatus.PENDING_REVIEW) {
    const publications = await this.prisma.publication.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { systemNickname: true } },
        reviewedBy: { select: { systemNickname: true } },
        template: { select: { name: true } },
        templateVersion: { select: { versionNumber: true } },
        creation: { select: { inputAssetId: true, outputAssetId: true, createdAt: true } },
      },
      take: 100,
    });
    return publications.map((publication) => ({
      id: publication.id,
      status: publication.status,
      author: publication.user.systemNickname,
      templateName: publication.template.name,
      templateVersion: publication.templateVersion.versionNumber,
      inputAssetId: publication.creation.inputAssetId,
      outputAssetId: publication.creation.outputAssetId,
      inputImagePath: `/api/v1/admin/assets/${publication.creation.inputAssetId}/file`,
      outputImagePath: `/api/v1/admin/assets/${publication.creation.outputAssetId}/file`,
      reviewReasonCode: publication.reviewReasonCode,
      reviewedBy: publication.reviewedBy?.systemNickname ?? null,
      reviewedAt: publication.reviewedAt,
      createdAt: publication.createdAt,
    }));
  }

  async approve(operatorUserId: string, publicationId: string) {
    const result = await this.prisma.publication.updateMany({
      where: { id: publicationId, status: PublicationStatus.PENDING_REVIEW },
      data: {
        status: PublicationStatus.PUBLISHED,
        reviewedByUserId: operatorUserId,
        reviewedAt: new Date(),
        publishedAt: new Date(),
        reviewReasonCode: null,
      },
    });
    if (!result.count) await this.throwReviewConflict(publicationId);
    return this.prisma.publication.findUniqueOrThrow({ where: { id: publicationId } });
  }

  async reject(operatorUserId: string, publicationId: string, reasonCode: string) {
    const result = await this.prisma.publication.updateMany({
      where: { id: publicationId, status: PublicationStatus.PENDING_REVIEW },
      data: {
        status: PublicationStatus.REJECTED,
        reviewedByUserId: operatorUserId,
        reviewedAt: new Date(),
        reviewReasonCode: reasonCode,
      },
    });
    if (!result.count) await this.throwReviewConflict(publicationId);
    return this.prisma.publication.findUniqueOrThrow({ where: { id: publicationId } });
  }

  listReports() {
    return this.prisma.report.findMany({
      where: { status: ReportStatus.OPEN },
      orderBy: { createdAt: 'asc' },
      include: {
        reporter: { select: { systemNickname: true } },
        publication: { select: { id: true, status: true } },
        template: { select: { id: true, name: true } },
      },
      take: 100,
    });
  }

  private async throwReviewConflict(publicationId: string): Promise<never> {
    const publication = await this.prisma.publication.findUnique({ where: { id: publicationId } });
    if (!publication) throw new NotFoundException('Publication not found');
    throw new ConflictException(`Publication is already ${publication.status}`);
  }
}
