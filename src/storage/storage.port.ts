import { Readable } from 'node:stream';

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');

export interface StoredObject {
  key: string;
  size: number;
  checksum: string;
}

export interface StorageAdapter {
  put(key: string, body: Buffer): Promise<StoredObject>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ensureWritable(): Promise<void>;
}
