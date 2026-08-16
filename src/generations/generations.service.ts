import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetKind, CreationStatus, GenerationStatus, SafetyStatus, TemplateStatus, TemplateVersionStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_ADAPTER, StorageAdapter } from '../storage/storage.port';
import { AssetsService } from '../assets/assets.service';
import { extensionForMime } from '../assets/image-signature';
import { CreateGenerationDto } from './dto/create-generation.dto';

@Injectable()
export class GenerationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly assets: AssetsService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  async create(userId: string, input: CreateGenerationDto, idempotencyKey: string) {
    const existing = await this.prisma.generationJob.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.userId !== userId) throw new NotFoundException('Generation job not found');
      return this.mapJob(existing, await this.assets.createFileToken(userId));
    }

    const version = await this.prisma.templateVersion.findFirst({
      where: {
        id: input.templateVersionId,
        status: TemplateVersionStatus.PUBLISHED,
        template: { status: TemplateStatus.ACTIVE, deletedAt: null },
      },
      include: { template: true },
    });
    if (!version) throw new NotFoundException('Template version not found');

    const asset = await this.prisma.asset.findFirst({
      where: { id: input.inputAssetId, createdByUserId: userId, kind: AssetKind.USER_INPUT, deletedAt: null },
    });
    if (!asset) throw new NotFoundException('Input asset not found');

    const outputSpecs = version.outputSpecs as Record<string, unknown>;
    const ratios = Array.isArray(outputSpecs.ratios) ? outputSpecs.ratios : [];
    if (!ratios.includes(input.aspectRatio)) {
      throw new UnprocessableEntityException('Aspect ratio is not supported by this template');
    }

    const job = await this.prisma.generationJob.create({
      data: {
        userId,
        templateId: version.templateId,
        templateVersionId: version.id,
        inputAssetId: asset.id,
        aspectRatio: input.aspectRatio,
        provider: this.config.get<string>('MODEL_PROVIDER', 'mock'),
        status: GenerationStatus.QUEUED,
        idempotencyKey,
        billingEnabled: this.config.get<boolean>('BILLING_ENABLED', false),
        pointsCostSnapshot: 0,
      },
    });

    void this.runMockJob(job.id);
    return this.mapJob(job, await this.assets.createFileToken(userId), version.template.name);
  }

  async list(userId: string) {
    const token = await this.assets.createFileToken(userId);
    const jobs = await this.prisma.generationJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { template: { select: { name: true } } },
    });
    return jobs.map((job) => this.mapJob(job, token, job.template.name));
  }

  async get(userId: string, id: string) {
    const job = await this.prisma.generationJob.findFirst({
      where: { id, userId },
      include: { template: { select: { name: true } } },
    });
    if (!job) throw new NotFoundException('Generation job not found');
    return this.mapJob(job, await this.assets.createFileToken(userId), job.template.name);
  }

  private async runMockJob(jobId: string): Promise<void> {
    let outputKey: string | undefined;
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const running = await this.prisma.generationJob.update({
        where: { id: jobId },
        data: { status: GenerationStatus.RUNNING, startedAt: new Date(), attempt: { increment: 1 } },
        include: { inputAsset: true },
      });
      const chunks: Buffer[] = [];
      for await (const chunk of await this.storage.get(running.inputAsset.storageKey)) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);
      outputKey = `users/${running.userId}/outputs/${randomUUID()}.${extensionForMime(running.inputAsset.mimeType)}`;
      const stored = await this.storage.put(outputKey, body);

      await this.prisma.$transaction(async (tx) => {
        const output = await tx.asset.create({
          data: {
            storageKey: outputKey!,
            kind: AssetKind.GENERATED_OUTPUT,
            mimeType: running.inputAsset.mimeType,
            byteSize: BigInt(stored.size),
            sha256: stored.checksum,
            createdByUserId: running.userId,
            safetyStatus: SafetyStatus.APPROVED,
          },
        });
        await tx.generationJob.update({
          where: { id: running.id },
          data: { status: GenerationStatus.SUCCEEDED, outputAssetId: output.id, finishedAt: new Date() },
        });
        await tx.creation.create({
          data: {
            userId: running.userId,
            generationJobId: running.id,
            templateId: running.templateId,
            templateVersionId: running.templateVersionId,
            inputAssetId: running.inputAssetId,
            outputAssetId: output.id,
            status: CreationStatus.DRAFT,
          },
        });
      });
    } catch {
      if (outputKey) await this.storage.delete(outputKey);
      await this.prisma.generationJob.updateMany({
        where: { id: jobId, status: { not: GenerationStatus.SUCCEEDED } },
        data: { status: GenerationStatus.FAILED, failureCode: 'MOCK_GENERATION_FAILED', finishedAt: new Date() },
      });
    }
  }

  private mapJob(job: {
    id: string;
    templateId: string;
    templateVersionId: string;
    inputAssetId: string;
    outputAssetId: string | null;
    aspectRatio: string;
    status: GenerationStatus;
    failureCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  }, token: string, templateName?: string) {
    const filePath = (assetId: string | null) => assetId
      ? `/api/v1/assets/${assetId}/file?token=${encodeURIComponent(token)}`
      : null;
    return {
      id: job.id,
      templateId: job.templateId,
      templateName,
      templateVersionId: job.templateVersionId,
      aspectRatio: job.aspectRatio,
      status: job.status,
      failureCode: job.failureCode,
      inputAssetId: job.inputAssetId,
      inputFilePath: filePath(job.inputAssetId),
      outputAssetId: job.outputAssetId,
      outputFilePath: filePath(job.outputAssetId),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
