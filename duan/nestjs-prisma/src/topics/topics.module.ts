import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [NotificationsModule, ActivitiesModule],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
