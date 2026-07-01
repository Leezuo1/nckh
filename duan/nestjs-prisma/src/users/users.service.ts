import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Lấy tất cả user, có thể filter theo role
  async findAll(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        fullName: true,
        userId: true,
        faculty: true,
        batch: true,
        gender: true,
        phone: true,
        outlook: true,
        role: true,
        status: true,
        created: true,
      },
      orderBy: { created: 'desc' },
    });
  }

  // Lấy danh sách sinh viên
  async findStudents() {
    return this.findAll(UserRole.Student);
  }

  // Lấy danh sách giảng viên
  async findLecturers() {
    return this.findAll(UserRole.Lecturer);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        userId: true,
        faculty: true,
        batch: true,
        gender: true,
        phone: true,
        outlook: true,
        role: true,
        status: true,
        created: true,
        topicParticipant: {
          include: {
            topic: {
              select: {
                id: true,
                topicId: true,
                topicName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async create(dto: CreateUserDto) {
    // Kiểm tra trùng
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { userId: dto.userId },
          { outlook: dto.outlook },
          { phone: dto.phone },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Người dùng với MSSV/email/phone này đã tồn tại');
    }

    // Hash mật khẩu nếu Admin có nhập (để user login được bằng MSSV + mật khẩu)
    const { password, ...rest } = dto;
    const data: any = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({ data });
  }

  // Admin đặt / reset mật khẩu cho user
  async setPassword(id: string, password: string) {
    await this.findOne(id);
    if (!password || password.length < 6) {
      throw new ConflictException('Mật khẩu phải có ít nhất 6 ký tự');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { success: true };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  // User tự update profile của mình
  async updateProfile(id: string, dto: any) {
    await this.findOne(id);
    // Kiểm tra trùng phone nếu thay đổi
    if (dto.phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Số điện thoại đã được sử dụng');
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        fullName: true,
        userId: true,
        faculty: true,
        batch: true,
        gender: true,
        phone: true,
        outlook: true,
        role: true,
      },
    });
  }

  // Hard delete: xóa hẳn user khỏi DB.
  // Dọn / gỡ các bản ghi tham chiếu tới user trước để không để lại dữ liệu rác
  // và tránh lỗi ràng buộc khi xóa.
  async remove(id: string) {
    await this.findOne(id);

    // Xóa các bản ghi phụ thuộc trực tiếp vào user
    await this.prisma.topicParticipant.deleteMany({ where: { userId: id } });
    await this.prisma.activity.deleteMany({ where: { userId: id } });
    await this.prisma.notification.deleteMany({ where: { userId: id } });
    await this.prisma.topicAccess.deleteMany({ where: { userId: id } });

    // Gỡ tham chiếu ở các bản ghi muốn giữ lại (đề tài đã nộp, tài liệu đã tải lên)
    await this.prisma.document.updateMany({
      where: { uploaderId: id },
      data: { uploaderId: null },
    });
    await this.prisma.topic.updateMany({
      where: { submitterId: id },
      data: { submitterId: null },
    });

    return this.prisma.user.delete({ where: { id } });
  }
}
