import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AssetKind, SafetyStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_ADAPTER, StorageAdapter } from '../storage/storage.port';
import { detectImageMime, extensionForMime } from './image-signature';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  async uploadInput(userId: string, file: Express.Multer.File) {
    const detectedMime = detectImageMime(file.buffer);
    if (!detectedMime) throw new UnsupportedMediaTypeException('Only PNG, JPEG and WebP images are supported');

    const key = `users/${userId}/inputs/${randomUUID()}.${extensionForMime(detectedMime)}`;
    const stored = await this.storage.put(key, file.buffer);
    try {
      const asset = await this.prisma.asset.create({
        data: {
          storageKey: key,
          kind: AssetKind.USER_INPUT,
          mimeType: detectedMime,
          byteSize: BigInt(stored.size),
          sha256: stored.checksum,
          createdByUserId: userId,
          safetyStatus: SafetyStatus.APPROVED,
        },
      });
      return this.mapAsset(asset, await this.createFileToken(userId));
    } catch (error) {
      await this.storage.delete(key);
      throw error;
    }
  }

  async getAuthorizedFile(assetId: string, token: string) {
    let userId: string;
    try {
      userId = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub;
    } catch {
      throw new NotFoundException('Asset not found');
    }
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, createdByUserId: userId, deletedAt: null },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return { asset, stream: await this.storage.get(asset.storageKey) };
  }

  mapAsset(asset: { id: string; mimeType: string; byteSize: bigint; safetyStatus: SafetyStatus }, token: string) {
    return {
      id: asset.id,
      mimeType: asset.mimeType,
      byteSize: Number(asset.byteSize),
      safetyStatus: asset.safetyStatus,
      filePath: `/api/v1/assets/${asset.id}/file?token=${encodeURIComponent(token)}`,
    };
  }

  createFileToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId, scope: 'asset' }, { expiresIn: '1h' });
  }
}
