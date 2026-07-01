import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileFormat } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  // Tạo document record (sau khi file đã được upload bởi multer)
  async create(data: {
    topicId: string;
    uploaderId: string;
    fileName: string;
    storedName: string;
    size: number;
    format: FileFormat;
    note?: string;
  }) {
    // Kiểm tra topic tồn tại
    const topic = await this.prisma.topic.findUnique({ where: { id: data.topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');

    // Khoá upload khi đang Báo Cáo / Nghiệm thu (chỉ cho tải xuống)
    if (topic.status === 'Reporting' || topic.status === 'Done') {
      throw new ForbiddenException('Đề tài đang bị khoá, không thể tải tài liệu lên');
    }

    return this.prisma.document.create({ data });
  }

  // Lấy 1 document theo id
  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    return doc;
  }

  // Lấy danh sách documents của 1 topic
  async findByTopic(topicId: string) {
    return this.prisma.document.findMany({
      where: { topicId },
      include: { uploader: { select: { fullName: true } } },
      orderBy: { uploaded: 'desc' },
    });
  }

  // Xóa document (chỉ uploader hoặc Admin)
  async remove(id: string, user: any) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    if (user.role !== 'Admin' && doc.uploaderId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xóa tài liệu này');
    }
    // Khoá xoá khi đề tài đang Báo Cáo / Nghiệm Thu
    const topic = await this.prisma.topic.findUnique({ where: { id: doc.topicId } });
    if (user.role !== 'Admin' && topic && (topic.status === 'Reporting' || topic.status === 'Done')) {
      throw new ForbiddenException('Đề tài đang bị khoá, không thể xoá tài liệu');
    }
    return this.prisma.document.delete({ where: { id } });
  }

  // Helper: detect format từ extension
  detectFormat(fileName: string): FileFormat {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'docx' || ext === 'doc') return FileFormat.Docx;
    if (ext === 'pdf') return FileFormat.Pdf;
    return FileFormat.Other;
  }
}
