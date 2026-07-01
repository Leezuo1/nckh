import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimelinesService {
  constructor(private prisma: PrismaService) {}

  // Khoá thao tác khi đề tài đang Báo Cáo / Nghiệm Thu (Admin vẫn được)
  private assertNotLocked(status: string, role: string) {
    if (role !== 'Admin' && (status === 'Reporting' || status === 'Done')) {
      throw new ForbiddenException('Đề tài đang bị khoá, không thể chỉnh mốc thời gian');
    }
  }

  // Lấy danh sách timeline của topic
  async findByTopic(topicId: string) {
    return this.prisma.timeline.findMany({
      where: { topicId },
      orderBy: { deadline: 'asc' },
    });
  }

  // Tạo timeline mới
  async create(data: { topicId: string; timelineName: string; deadline: string }, user: any) {
    const topic = await this.prisma.topic.findUnique({ where: { id: data.topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');

    // Chỉ Leader (submitter) hoặc Admin mới được tạo
    if (user.role !== 'Admin' && topic.submitterId !== user.id) {
      throw new ForbiddenException('Chỉ chủ nhiệm đề tài mới được thêm timeline');
    }
    this.assertNotLocked(topic.status, user.role);

    return this.prisma.timeline.create({
      data: {
        topicId: data.topicId,
        timelineName: data.timelineName,
        deadline: new Date(data.deadline),
      },
    });
  }

  // Update timeline (đổi tên, đổi deadline)
  async update(id: string, data: { timelineName?: string; deadline?: string }, user: any) {
    const tl = await this.prisma.timeline.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!tl) throw new NotFoundException('Không tìm thấy timeline');

    if (user.role !== 'Admin' && tl.topic.submitterId !== user.id) {
      throw new ForbiddenException('Chỉ chủ nhiệm đề tài mới được sửa timeline');
    }
    this.assertNotLocked(tl.topic.status, user.role);

    return this.prisma.timeline.update({
      where: { id },
      data: {
        ...(data.timelineName && { timelineName: data.timelineName }),
        ...(data.deadline && { deadline: new Date(data.deadline) }),
      },
    });
  }

  // Toggle hoàn thành
  async toggleComplete(id: string, user: any) {
    const tl = await this.prisma.timeline.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!tl) throw new NotFoundException('Không tìm thấy timeline');

    // Cho phép participant (member của topic) toggle complete
    const isParticipant = await this.prisma.topicParticipant.findUnique({
      where: { topicId_userId: { topicId: tl.topicId, userId: user.id } },
    });
    if (user.role !== 'Admin' && tl.topic.submitterId !== user.id && !isParticipant) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa timeline này');
    }
    this.assertNotLocked(tl.topic.status, user.role);

    const newStatus = !tl.isCompleted;
    return this.prisma.timeline.update({
      where: { id },
      data: {
        isCompleted: newStatus,
        completed: newStatus ? new Date() : null,
      },
    });
  }

  // Xóa timeline
  async remove(id: string, user: any) {
    const tl = await this.prisma.timeline.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!tl) throw new NotFoundException('Không tìm thấy timeline');

    if (user.role !== 'Admin' && tl.topic.submitterId !== user.id) {
      throw new ForbiddenException('Chỉ chủ nhiệm đề tài mới được xóa timeline');
    }
    this.assertNotLocked(tl.topic.status, user.role);

    return this.prisma.timeline.delete({ where: { id } });
  }
}
