import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AssetsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
