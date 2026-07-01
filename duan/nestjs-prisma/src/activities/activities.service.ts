import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // Ghi 1 activity (gọi từ các service khác)
  async log(userId: string, action: string, detail?: string, topicId?: string) {
    try {
      return await this.prisma.activity.create({
        data: { userId, action, detail, topicId },
      });
    } catch (err) {
      console.error('Log activity that bai:', err);
      return null;
    }
  }

  // Activity của 1 topic
  async findByTopic(topicId: string) {
    return this.prisma.activity.findMany({
      where: { topicId },
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { created: 'desc' },
      take: 50,
    });
  }

  // Activity của 1 user
  async findByUser(userId: string) {
    return this.prisma.activity.findMany({
      where: { userId },
      include: { topic: { select: { topicName: true } } },
      orderBy: { created: 'desc' },
      take: 50,
    });
  }

  // Toàn bộ activity (admin) — phân trang + sort + lọc 24h cho lazy loading
  //  - skip/take: cửa sổ phân trang (take giới hạn 1..100)
  //  - order: 'desc' (mới→cũ, mặc định) | 'asc' (cũ→mới)
  //  - within24h: true → chỉ lấy hoạt động trong 24 giờ gần nhất
  async findAll(opts?: { skip?: number; take?: number; order?: 'asc' | 'desc'; within24h?: boolean; from?: string; to?: string }) {
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const order: 'asc' | 'desc' = opts?.order === 'asc' ? 'asc' : 'desc';

    // Lọc thời gian: ưu tiên khoảng ngày tường minh (from/to); nếu không có thì mới áp lọc 24h
    let where: { created?: { gte?: Date; lte?: Date } } = {};
    const fromDate = opts?.from ? new Date(opts.from) : null;
    const toDate = opts?.to ? new Date(opts.to) : null;
    if ((fromDate && !isNaN(fromDate.getTime())) || (toDate && !isNaN(toDate.getTime()))) {
      where.created = {};
      if (fromDate && !isNaN(fromDate.getTime())) where.created.gte = fromDate;
      if (toDate && !isNaN(toDate.getTime())) where.created.lte = toDate;
    } else if (opts?.within24h) {
      where = { created: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    }
    return this.prisma.activity.findMany({
      where,
      include: {
        user: { select: { fullName: true, role: true } },
        topic: { select: { topicName: true } },
      },
      orderBy: { created: order },
      skip,
      take,
    });
  }
}
