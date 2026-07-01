import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TopicsModule } from './topics/topics.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StatsModule } from './stats/stats.module';
import { TimelinesModule } from './timelines/timelines.module';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, TopicsModule, DocumentsModule, NotificationsModule, StatsModule, TimelinesModule, ActivitiesModule],
})
export class AppModule {}
