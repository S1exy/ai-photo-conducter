import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/env.validation';
import { GenerationsModule } from './generations/generations.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    TemplatesModule,
    AssetsModule,
    GenerationsModule,
  ],
})
export class AppModule {}
