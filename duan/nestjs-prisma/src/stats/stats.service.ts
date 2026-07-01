import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  // Số liệu công khai cho trang chủ
  async getPublicStats() {
    const [topics, lecturers, students] = await Promise.all([
      this.prisma.topic.count({ where: { isAssigned: true } }),
      this.prisma.user.count({ where: { role: 'Lecturer', status: 'Active' } }),
      this.prisma.user.count({ where: { role: 'Student', status: 'Active' } }),
    ]);
    return { topics, lecturers, students };
  }
}
