import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';

@Module({
  imports: [AssetsModule],
  controllers: [GenerationsController],
  providers: [GenerationsService],
})
export class GenerationsModule {}
