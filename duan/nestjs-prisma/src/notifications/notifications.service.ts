import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Tạo thông báo (gọi từ service khác)
  async create(
    userId: string,
    title: string,
    message: string,
    link?: string,
    type?: string,
    data?: any,
  ) {
    return this.prisma.notification.create({
      data: { userId, title, message, link, type, data },
    });
  }

  // Lấy thông báo của user
  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { created: 'desc' },
      take: 50,
    });
  }

  // Đếm thông báo chưa đọc
  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // Mark 1 thông báo đã đọc
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // Mark tất cả đã đọc
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
