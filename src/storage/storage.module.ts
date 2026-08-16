import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './local-storage.adapter';
import { STORAGE_ADAPTER } from './storage.port';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new LocalStorageAdapter(config.getOrThrow<string>('STORAGE_ROOT')),
    },
  ],
  exports: [STORAGE_ADAPTER],
})
export class StorageModule {}
