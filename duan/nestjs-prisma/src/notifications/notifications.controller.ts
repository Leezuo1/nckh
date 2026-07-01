import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /api/notifications
  @Get()
  findMine(@Request() req) {
    return this.notificationsService.findByUser(req.user.id);
  }

  // GET /api/notifications/unread-count
  @Get('unread-count')
  async countUnread(@Request() req) {
    const count = await this.notificationsService.countUnread(req.user.id);
    return { count };
  }

  // PATCH /api/notifications/:id/read
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  // PATCH /api/notifications/read-all
  @Patch('read-all')
  markAllRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
