import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, open, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { StorageAdapter, StoredObject } from './storage.port';

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(key: string, body: Buffer): Promise<StoredObject> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });

    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, body, { flag: 'wx' });
    await rename(temporary, target);

    return {
      key,
      size: body.byteLength,
      checksum: createHash('sha256').update(body).digest('hex'),
    };
  }

  async get(key: string): Promise<Readable> {
    const target = this.resolveKey(key);
    await access(target);
    return createReadStream(target);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async ensureWritable(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const probe = resolve(this.root, `.write-probe-${randomUUID()}`);
    const handle = await open(probe, 'wx');
    await handle.close();
    await rm(probe, { force: true });
  }

  private resolveKey(key: string): string {
    if (key.trim() === '' || isAbsolute(key) || key.includes('..')) {
      throw new Error('Invalid storage key');
    }

    const target = resolve(this.root, key);
    if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Storage key escapes the configured root');
    }
    return target;
  }
}
