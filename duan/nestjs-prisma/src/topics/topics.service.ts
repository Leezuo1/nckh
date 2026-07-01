import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicStatus, UserRole, TopicParticipantRole } from '@prisma/client';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private activities: ActivitiesService,
  ) {}

  // ===== MỖI SV CHỈ ĐƯỢC THEO 1 ĐỀ TÀI =====

  // Trạng thái đề tài coi như SV vẫn "đang dính" (chưa hoàn thành / chưa huỷ):
  // mới tạo · chờ duyệt · chờ assign (Pending) và đang thực hiện (InProgress).
  private readonly UNFINISHED_TOPIC_STATUSES = [
    TopicStatus.Pending,
    TopicStatus.WaitingToStart,
    TopicStatus.InProgress,
    TopicStatus.Reporting,
    TopicStatus.Editing,
  ];

  // Tìm đề tài chưa hoàn thành mà 1 SV đang dính: là người đăng ký ý tưởng chưa assign,
  // hoặc đang là thành viên / chờ duyệt tham gia (PendingMember). null = SV đang rảnh.
  // exceptTopicId: bỏ qua chính đề tài đang thao tác (vd khi đang xin join đề tài đó).
  private async findStudentActiveTopic(userId: string, exceptTopicId?: string) {
    return this.prisma.topic.findFirst({
      where: {
        ...(exceptTopicId && { id: { not: exceptTopicId } }),
        status: { in: this.UNFINISHED_TOPIC_STATUSES },
        OR: [
          { topicParticipant: { some: { userId } } },
          { isAssigned: false, submitterId: userId },
        ],
      },
      select: { id: true, topicName: true, status: true },
    });
  }

  // ===== ĐỀ TÀI (isAssigned = true) =====

  async findAllTopics(filters?: {
    status?: TopicStatus;
    year?: string;
    search?: string;
  }) {
    const topics = await this.prisma.topic.findMany({
      where: {
        isAssigned: true,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.year && { year: filters.year }),
        ...(filters?.search && {
          OR: [
            { topicName: { contains: filters.search, mode: 'insensitive' } },
            { topicId: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        submitter: { select: { fullName: true, userId: true, faculty: true } },
        topicParticipant: {
          include: {
            user: { select: { fullName: true, userId: true, role: true } },
          },
        },
      },
      orderBy: { deadline: 'asc' },
    });
    return this.decorateTopics(topics);
  }

  // ===== Ý TƯỞNG (isAssigned = false) =====

  async findAllIdeas(filters?: {
    search?: string;
    year?: string;
    onlyUnassigned?: boolean;
    onlyPendingApproval?: boolean;
    onlyApproved?: boolean;
  }) {
    return this.prisma.topic.findMany({
      where: {
        isAssigned: false,
        // Bỏ status:'Pending' cứng — mỗi nhánh filter tự set status cho phù hợp
        // onlyUnassigned: cho trang DS Ý Tưởng — chỉ ý tưởng đã duyệt + chưa có ai xin (chỉ Pending mới xin assign được)
        ...(filters?.onlyUnassigned && {
          isApproved: true,
          topicParticipant: { none: {} },
          status: TopicStatus.Pending,
        }),
        // onlyPendingApproval: cho trang Đăng ký ý tưởng — chỉ ý tưởng chưa duyệt
        ...(filters?.onlyPendingApproval && {
          isApproved: false,
          status: TopicStatus.Pending,
        }),
        // onlyApproved: cho Admin — ý tưởng đã duyệt (cả Chưa Assign + Chờ Assign)
        ...(filters?.onlyApproved && {
          isApproved: true,
          status: TopicStatus.Pending,
        }),
        // Không filter đặc biệt → lấy cả Pending + Cancelled (ý tưởng huỷ vẫn hiện để quản lý/khôi phục)
        ...(!filters?.onlyUnassigned && !filters?.onlyPendingApproval && !filters?.onlyApproved && {
          status: { in: [TopicStatus.Pending, TopicStatus.Cancelled] },
        }),
        ...(filters?.year && { year: filters.year }),
        ...(filters?.search && {
          OR: [
            { topicName: { contains: filters.search, mode: 'insensitive' } },
            { topicId: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        submitter: {
          select: { fullName: true, userId: true, faculty: true, role: true },
        },
        topicParticipant: {
          include: {
            user: { select: { fullName: true, userId: true, role: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  // ===== ĐỀ TÀI CỦA TÔI =====

  async findMyTopics(userId: string) {
    const topics = await this.prisma.topic.findMany({
      where: {
        OR: [
          // Đề tài đã assign + là participant
          { isAssigned: true, topicParticipant: { some: { userId } } },
          // Ý tưởng chưa assign + là người submit
          { isAssigned: false, submitterId: userId },
          // Ý tưởng chưa assign + mình đã xin tham gia (PendingMember)
          { isAssigned: false, topicParticipant: { some: { userId, topicParticipantRole: 'PendingMember' } } },
        ],
      },
      include: {
        submitter: { select: { fullName: true, userId: true, faculty: true } },
        topicParticipant: {
          include: {
            user: { select: { fullName: true, userId: true, role: true, faculty: true } },
          },
        },
        timelines: { orderBy: { deadline: 'asc' } },
        documents: {
          include: { uploader: { select: { fullName: true } } },
          orderBy: { uploaded: 'desc' },
        },
      },
      orderBy: { deadline: 'asc' },
    });
    return this.decorateTopics(topics);
  }

  // ===== CHI TIẾT ĐỀ TÀI =====

  async findOne(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        submitter: { select: { fullName: true, userId: true, faculty: true } },
        topicParticipant: {
          include: {
            user: { select: { fullName: true, userId: true, role: true, faculty: true } },
          },
        },
        documents: {
          include: { uploader: { select: { fullName: true } } },
          orderBy: { uploaded: 'desc' },
        },
        timelines: { orderBy: { deadline: 'asc' } },
        activities: {
          include: { user: { select: { fullName: true } } },
          orderBy: { created: 'desc' },
          take: 20,
        },
      },
    });

    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const [decorated] = await this.decorateTopics([topic]);
    return decorated;
  }

  // ===== ĐĂNG KÝ Ý TƯỞNG =====

  async createIdea(dto: CreateTopicDto, submitterId: string) {
    const submitter = await this.prisma.user.findUnique({
      where: { id: submitterId },
      select: { role: true },
    });
    const isStudent = submitter?.role === UserRole.Student;

    // Mỗi SV chỉ được theo 1 đề tài: chặn nếu đang có đề tài chưa hoàn thành.
    // GV/Admin không bị giới hạn (được đề xuất nhiều ý tưởng).
    if (isStudent) {
      const active = await this.findStudentActiveTopic(submitterId);
      if (active) {
        throw new ForbiddenException(
          `Bạn đang có đề tài "${active.topicName}" chưa hoàn thành nên không thể đăng ký ý tưởng mới. ` +
          `Mỗi sinh viên chỉ được theo 1 đề tài tại một thời điểm.`,
        );
      }
    }

    // SV không được tự set thời gian thực hiện — chỉ GV mới được.
    // Bỏ durationMonths khỏi dữ liệu nếu người đăng ký là SV (dùng mặc định ở schema).
    const { durationMonths, ...rest } = dto;

    const created = await this.prisma.topic.create({
      data: {
        ...rest,
        ...(!isStudent && { durationMonths }),
        isAssigned: false,
        submitterId,
        deadline: new Date(dto.deadline),
      },
    });
    await this.activities.log(submitterId, 'Đăng ký ý tưởng', `"${dto.topicName}"`, created.id);
    return created;
  }

  // ===== XIN JOIN ĐỀ TÀI =====

  async requestAssign(topicId: string, userId: string, students?: any[]) {
    // Kiểm tra đề tài tồn tại
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { submitter: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    if (!topic.isApproved) throw new ForbiddenException('Ý tưởng chưa được Admin duyệt');

    // Kiểm tra đã có nhóm khác xin chưa
    const existingPending = await this.prisma.topicParticipant.findFirst({
      where: { topicId, topicParticipantRole: TopicParticipantRole.PendingMember },
    });
    if (existingPending) {
      throw new ForbiddenException('Đề tài đã có nhóm khác xin assign, vui lòng đợi');
    }

    // === Mỗi SV chỉ được theo 1 đề tài: kiểm tra cả người xin lẫn từng thành viên nhóm ===
    // (bỏ qua chính đề tài này; GV không bị giới hạn). Validate trước khi tạo bất kỳ record nào.
    const requester = await this.prisma.user.findUnique({ where: { id: userId } });

    // req 3: GV chỉ được nhận hướng dẫn ý tưởng của SINH VIÊN, không phải của GV khác.
    // (GV vẫn được tham gia nhiều đề tài của SV — không bị giới hạn 1 đề tài như SV.)
    if (requester?.role === UserRole.Lecturer && topic.submitter?.role === UserRole.Lecturer) {
      throw new ForbiddenException('Giảng viên không thể nhận hướng dẫn ý tưởng của giảng viên khác');
    }

    const busyStudents: string[] = [];

    if (requester?.role === UserRole.Student) {
      const active = await this.findStudentActiveTopic(userId, topicId);
      if (active) {
        busyStudents.push(`${requester.fullName} đang ở đề tài "${active.topicName}"`);
      }
    }

    if (students && students.length > 0) {
      for (const s of students) {
        if (!s.studentId) continue;
        const member = await this.prisma.user.findUnique({ where: { userId: s.studentId } });
        // Bỏ qua nếu MSSV không có trong DB, trùng người xin, hoặc không phải SV
        if (!member || member.id === userId || member.role !== UserRole.Student) continue;
        const active = await this.findStudentActiveTopic(member.id, topicId);
        if (active) {
          busyStudents.push(`${member.fullName} (${member.userId}) đang ở đề tài "${active.topicName}"`);
        }
      }
    }

    if (busyStudents.length > 0) {
      throw new ForbiddenException(
        `Không thể xin tham gia vì có sinh viên đang dính đề tài chưa hoàn thành: ` +
        `${busyStudents.join('; ')}. Mỗi sinh viên chỉ được theo 1 đề tài tại một thời điểm.`,
      );
    }

    // 1. Tạo PendingMember cho requester
    const result = await this.prisma.topicParticipant.create({
      data: {
        topicId,
        userId,
        topicParticipantRole: TopicParticipantRole.PendingMember,
      },
    });

    // 2. Tạo PendingMember cho mỗi SV trong nhóm (match theo MSSV)
    if (students && students.length > 0) {
      for (const s of students) {
        if (!s.studentId) continue;
        const teamMember = await this.prisma.user.findUnique({
          where: { userId: s.studentId },
        });
        // Skip nếu user không tồn tại hoặc đã là requester
        if (!teamMember || teamMember.id === userId) continue;
        // Skip nếu đã có record (kể cả PendingMember từ trước)
        const exists = await this.prisma.topicParticipant.findUnique({
          where: { topicId_userId: { topicId, userId: teamMember.id } },
        });
        if (exists) continue;
        await this.prisma.topicParticipant.create({
          data: {
            topicId,
            userId: teamMember.id,
            topicParticipantRole: TopicParticipantRole.PendingMember,
          },
        });
      }
    }

    // 3. Lưu thông tin form (kể cả SV có MSSV không khớp DB) lên Topic
    // để hiển thị trên trang chi tiết đề tài
    await this.prisma.topic.update({
      where: { id: topicId },
      data: { teamMembersInfo: students || [] },
    });

    // Notification: thông báo submitter có người xin assign
    // (dùng lại `requester` đã fetch ở phần kiểm tra "1 đề tài / SV" phía trên)
    if (topic.submitterId) {
      const isLecturer = requester?.role === UserRole.Lecturer || requester?.role === UserRole.Admin;
      const action = isLecturer ? 'muốn hướng dẫn' : 'muốn tham gia';
      await this.notifications.create(
        topic.submitterId,
        isLecturer ? 'Giảng viên xin hướng dẫn' : 'Có người xin tham gia đề tài',
        `${requester?.fullName || 'Một người dùng'} ${action} đề tài "${topic.topicName}"`,
        `/de-tai-cua-toi/${topicId}`,
        'request_join',
        {
          topicId,
          requesterId: userId,
          requesterName: requester?.fullName,
          topicName: topic.topicName,
          students: students || [],
        },
      );
    }
    await this.activities.log(userId, 'Xin tham gia đề tài', `"${topic.topicName}"`, topicId);

    return result;
  }

  async respondAssign(topicId: string, userId: string, accept: boolean, currentUser?: any) {
    if (typeof accept !== 'boolean') {
      throw new BadRequestException('Thiếu hành động chấp nhận/từ chối');
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { submitter: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');

    // Chỉ chủ nhiệm đề tài (người đăng ý tưởng) hoặc Admin mới được duyệt/từ chối
    if (currentUser?.role !== UserRole.Admin && topic.submitterId !== currentUser?.id) {
      throw new ForbiddenException('Bạn không có quyền duyệt yêu cầu tham gia đề tài này');
    }

    // Lấy tất cả PendingMember của topic (cả nhóm) — kèm user để biết role
    const pendingMembers = await this.prisma.topicParticipant.findMany({
      where: { topicId, topicParticipantRole: TopicParticipantRole.PendingMember },
      include: { user: true },
    });

    if (accept) {
      // 1. Gán role theo user.role:
      //    - GV (Lecturer) hoặc Admin → Supervisor (giảng viên hướng dẫn)
      //    - SV requester → Leader (chủ nhiệm)
      //    - SV còn lại → Member
      for (const pm of pendingMembers) {
        let newRole: TopicParticipantRole;
        if (pm.user?.role === UserRole.Lecturer || pm.user?.role === UserRole.Admin) {
          newRole = TopicParticipantRole.Supervisor;
        } else if (pm.userId === userId) {
          newRole = TopicParticipantRole.Leader;
        } else {
          newRole = TopicParticipantRole.Member;
        }
        await this.prisma.topicParticipant.update({
          where: { id: pm.id },
          data: { topicParticipantRole: newRole },
        });
      }

      // 2. Thêm submitter làm participant — role theo user.role:
      //    GV/Admin submitter → Supervisor; SV submitter → Leader
      if (topic.submitterId) {
        const submitterRole = (topic.submitter?.role === UserRole.Lecturer || topic.submitter?.role === UserRole.Admin)
          ? TopicParticipantRole.Supervisor
          : TopicParticipantRole.Leader;
        await this.prisma.topicParticipant.upsert({
          where: { topicId_userId: { topicId, userId: topic.submitterId } },
          create: {
            topicId,
            userId: topic.submitterId,
            topicParticipantRole: submitterRole,
          },
          update: { topicParticipantRole: submitterRole },
        });
      }

      // 3. Mark đề tài đã assign → chuyển sang "Chờ bắt đầu"
      //    startDate/deadline sẽ được set khi Admin Proceed sang Đang thực hiện
      const updated = await this.prisma.topic.update({
        where: { id: topicId },
        data: {
          isAssigned: true,
          ...(topic.status === TopicStatus.Pending && {
            status: TopicStatus.WaitingToStart,
          }),
        },
      });

      // 4. Notification: báo tất cả SV trong nhóm được accept
      for (const pm of pendingMembers) {
        if (!pm.userId) continue;
        await this.notifications.create(
          pm.userId,
          'Yêu cầu được chấp nhận',
          `Bạn đã được chấp nhận tham gia đề tài "${topic.topicName}"`,
          `/de-tai-cua-toi/${topicId}`,
        );
      }

      if (topic.submitterId) {
        await this.activities.log(
          topic.submitterId,
          'Chấp nhận nhóm tham gia',
          `Nhóm ${pendingMembers.length} thành viên vào "${topic.topicName}"`,
          topicId,
        );
      }

      return updated;
    } else {
      // Reject - xóa tất cả PendingMember của topic
      const result = await this.prisma.topicParticipant.deleteMany({
        where: { topicId, topicParticipantRole: TopicParticipantRole.PendingMember },
      });

      // Notification: báo tất cả SV trong nhóm bị reject
      for (const pm of pendingMembers) {
        if (!pm.userId) continue;
        await this.notifications.create(
          pm.userId,
          'Yêu cầu bị từ chối',
          `Yêu cầu tham gia đề tài "${topic.topicName}" của nhóm đã bị từ chối`,
        );
      }

      return result;
    }
  }

  // ===== TH1: GV TỰ ASSIGN VÀO Ý TƯỞNG CỦA SV (không cần duyệt) =====
  async lecturerAssignIdea(topicId: string, lecturerId: string, durationMonths?: number) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { submitter: true, topicParticipant: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy ý tưởng');
    if (topic.isAssigned) throw new ForbiddenException('Ý tưởng đã được assign');
    if (!topic.isApproved) throw new ForbiddenException('Ý tưởng chưa được Admin duyệt');

    const lecturer = await this.prisma.user.findUnique({ where: { id: lecturerId } });
    if (lecturer?.role !== UserRole.Lecturer && lecturer?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ giảng viên hoặc admin mới được tự assign trực tiếp');
    }
    // Không cho assign vào ý tưởng của chính mình
    if (topic.submitterId === lecturerId) {
      throw new ForbiddenException('Không thể assign vào ý tưởng của chính mình');
    }
    // CHỈ được nhận hướng dẫn ý tưởng của SINH VIÊN, không assign ý tưởng của GV khác
    if (topic.submitter?.role !== UserRole.Student) {
      throw new ForbiddenException('Chỉ được nhận hướng dẫn ý tưởng của sinh viên');
    }

    // 1. Đánh dấu đã assign → chuyển "Chờ bắt đầu"
    //    GV được set thời gian thực hiện (durationMonths) cho ý tưởng SV — 1 lần lúc này.
    //    startDate/deadline set khi Admin Proceed sang Đang thực hiện
    const updated = await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        isAssigned: true,
        status: TopicStatus.WaitingToStart,
        ...(durationMonths != null && { durationMonths }),
      },
    });

    // 2. Thêm người assign làm Supervisor (nếu là GV) hoặc Leader (nếu submitter là GV)
    const submitterRole = topic.submitter?.role;
    const assignerParticipantRole = submitterRole === UserRole.Student
      ? TopicParticipantRole.Supervisor
      : TopicParticipantRole.Member;
    await this.prisma.topicParticipant.upsert({
      where: { topicId_userId: { topicId, userId: lecturerId } },
      create: {
        topicId,
        userId: lecturerId,
        topicParticipantRole: assignerParticipantRole,
      },
      update: { topicParticipantRole: assignerParticipantRole },
    });

    // 3. Thêm submitter làm Leader (chủ nhiệm đề tài) nếu chưa có
    if (topic.submitterId) {
      await this.prisma.topicParticipant.upsert({
        where: { topicId_userId: { topicId, userId: topic.submitterId } },
        create: {
          topicId,
          userId: topic.submitterId,
          topicParticipantRole: submitterRole === UserRole.Student
            ? TopicParticipantRole.Leader
            : TopicParticipantRole.Supervisor,
        },
        update: {
          topicParticipantRole: submitterRole === UserRole.Student
            ? TopicParticipantRole.Leader
            : TopicParticipantRole.Supervisor,
        },
      });

      // 4. Notification: báo SV submitter
      await this.notifications.create(
        topic.submitterId,
        'Giảng viên đã nhận hướng dẫn',
        `${lecturer.fullName} đã nhận hướng dẫn ý tưởng "${topic.topicName}"`,
        `/de-tai-cua-toi/${topicId}`,
      );
    }

    // 5. Activity log
    await this.activities.log(lecturerId, 'GV nhận hướng dẫn', `"${topic.topicName}"`, topicId);

    return updated;
  }

  // ===== ADMIN: DUYỆT Ý TƯỞNG → ĐỀ TÀI =====

  async assignIdea(id: string) {
    const topic = await this.findOne(id);

    // Admin duyệt: chỉ đánh dấu isApproved = true
    // Idea giờ sẽ hiện trong "Danh sách ý tưởng" để mọi người có thể xin assign
    const updated = await this.prisma.topic.update({
      where: { id },
      data: { isApproved: true },
    });

    // Notification: báo submitter ý tưởng được duyệt
    if (topic.submitterId) {
      await this.notifications.create(
        topic.submitterId,
        'Ý tưởng đã được duyệt',
        `Ý tưởng "${topic.topicName}" của bạn đã được Admin duyệt và hiển thị công khai`,
        `/danh-sach-y-tuong`,
      );
      await this.activities.log(topic.submitterId, 'Duyệt ý tưởng', `"${topic.topicName}"`, id);
    }

    return updated;
  }

  // ===== CẬP NHẬT ĐỀ TÀI =====

  async update(id: string, dto: UpdateTopicDto, user: any) {
    const topic = await this.findOne(id);

    // Chỉ submitter hoặc Admin mới được update
    if (user.role !== UserRole.Admin && topic.submitterId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa đề tài này');
    }

    // Khoá khi đang Báo Cáo / Nghiệm thu (Admin vẫn được phép can thiệp)
    if (user.role !== UserRole.Admin && this.LOCKED_STATUSES.includes(topic.status)) {
      throw new ForbiddenException('Đề tài đang bị khoá, không thể chỉnh sửa');
    }

    // Thời gian thực hiện (durationMonths + startDate): chỉ Admin được điều chỉnh.
    // GV chỉ set durationMonths 1 lần lúc tạo / lúc assign; SV không bao giờ được set.
    if (
      (dto.durationMonths !== undefined || dto.startDate !== undefined) &&
      user.role !== UserRole.Admin
    ) {
      throw new ForbiddenException('Chỉ Admin được điều chỉnh thời gian thực hiện');
    }

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.deadline) data.deadline = new Date(dto.deadline);

    // Admin đổi durationMonths khi đề tài đã bắt đầu → tính lại deadline = startDate + duration.
    // Chỉ áp dụng khi KHÔNG gửi deadline tường minh (tránh ghi đè khoảng ngày Admin tự chọn).
    if (dto.durationMonths !== undefined && dto.deadline === undefined && topic.startDate) {
      const newDeadline = new Date(topic.startDate);
      newDeadline.setMonth(newDeadline.getMonth() + dto.durationMonths);
      data.deadline = newDeadline;
    }

    // Admin chọn khoảng ngày tường minh (bắt đầu → kết thúc) → đồng bộ lại durationMonths
    // để luồng "Bắt đầu đề tài" (proceed) dùng nhất quán.
    const effectiveStart = data.startDate ?? topic.startDate;
    if (data.deadline && effectiveStart) {
      const ms = new Date(data.deadline).getTime() - new Date(effectiveStart).getTime();
      if (ms > 0) {
        data.durationMonths = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30.44)));
      }
    }

    return this.prisma.topic.update({ where: { id }, data });
  }

  // ===== XÓA ĐỀ TÀI (Admin only) =====

  async remove(id: string) {
    await this.findOne(id);
    // Xoa cac records lien quan truoc
    await this.prisma.activity.deleteMany({ where: { topicId: id } });
    await this.prisma.document.deleteMany({ where: { topicId: id } });
    await this.prisma.timeline.deleteMany({ where: { topicId: id } });
    await this.prisma.topicParticipant.deleteMany({ where: { topicId: id } });
    await this.prisma.topicAccess.deleteMany({ where: { topicId: id } });
    return this.prisma.topic.delete({ where: { id } });
  }

  // ===== THỐNG KÊ TRUY CẬP =====

  // Ghi nhận 1 lần truy cập (chỉ tính participant trong nhóm)
  async recordAccess(topicId: string, userId: string) {
    const participant = await this.prisma.topicParticipant.findUnique({
      where: { topicId_userId: { topicId, userId } },
    });
    // Chỉ ghi nếu là thành viên thật trong nhóm (không tính PendingMember)
    if (!participant || participant.topicParticipantRole === 'PendingMember') {
      return { recorded: false };
    }
    await this.prisma.topicAccess.create({ data: { topicId, userId } });
    return { recorded: true };
  }

  // Thống kê truy cập theo tháng (từ startDate → deadline)
  async getAccessStats(topicId: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');

    const accesses = await this.prisma.topicAccess.findMany({
      where: { topicId },
      select: { accessed: true },
    });

    // Đếm theo tháng (1-12)
    const monthly = Array(12).fill(0);
    for (const a of accesses) {
      const m = new Date(a.accessed).getMonth(); // 0-11
      monthly[m]++;
    }

    return monthly.map((value, i) => ({ month: `T${i + 1}`, value }));
  }

  // ===== CẬP NHẬT TIẾN ĐỘ (chỉ Supervisor / Leader) =====

  async updateProgress(topicId: string, progress: number, userId: string) {
    // Chặn NaN / undefined / chuỗi lọt vào DB (FE gửi Number nhưng vẫn phòng thủ)
    if (typeof progress !== 'number' || !Number.isFinite(progress)) {
      throw new BadRequestException('Tiến độ phải là số từ 0 đến 100');
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { topicParticipant: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');

    // Chỉ cho chỉnh khi đang thực hiện hoặc đang trong thời gian Chỉnh Sửa
    if (topic.status !== TopicStatus.InProgress && topic.status !== TopicStatus.Editing) {
      throw new ForbiddenException('Chỉ cập nhật tiến độ khi đề tài đang thực hiện');
    }

    // Kiểm tra quyền: Supervisor hoặc Leader
    const me = topic.topicParticipant.find(p => p.userId === userId);
    const isSupervisorOrLeader =
      me?.topicParticipantRole === 'Supervisor' || me?.topicParticipantRole === 'Leader';
    // Admin cũng được phép
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!isSupervisorOrLeader && user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ GV hướng dẫn hoặc chủ nhiệm đề tài mới được chỉnh tiến độ');
    }

    const clamped = Math.max(0, Math.min(100, progress));

    // Append vào lịch sử tiến độ
    const history = Array.isArray(topic.progressHistory) ? topic.progressHistory : [];
    history.push({ date: new Date().toISOString(), value: clamped });

    return this.prisma.topic.update({
      where: { id: topicId },
      data: {
        progress: clamped,
        progressHistory: history as any,
        // KHÔNG tự chuyển Done khi 100% — hoàn thành (Nghiệm thu) do Admin
        // điều khiển qua luồng Báo Cáo → Chỉnh Sửa → hết giờ.
      },
    });
  }

  // ===================================================================
  // ===== STATE MACHINE: PROCEED / UNDO / START-EDITING (Admin) =======
  // ===================================================================

  private readonly LOCKED_STATUSES: TopicStatus[] = [
    TopicStatus.Reporting,
    TopicStatus.Done,
  ];

  // Chặn ids rỗng/sai kiểu trước khi đụng DB (tránh `in: undefined` quét nhầm)
  private assertIds(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một đề tài');
    }
  }

  // Đẩy đề tài sang trạng thái kế tiếp.
  //  - Chờ bắt đầu  → Đang thực hiện:
  //      · Nếu Admin đã đặt sẵn ngày bắt đầu (qua box thời gian) → giữ nguyên startDate + deadline đó.
  //      · Nếu chưa → bắt đầu từ hôm nay, deadline = hôm nay + durationMonths.
  //  - Đang thực hiện (kể cả đang Trễ) → Báo Cáo (khoá)
  // (Báo Cáo → Chỉnh Sửa đi qua startEditing vì cần set thời gian)
  async proceed(ids: string[], adminId: string) {
    this.assertIds(ids);
    const topics = await this.prisma.topic.findMany({ where: { id: { in: ids } } });
    let updated = 0;
    for (const t of topics) {
      if (t.status === TopicStatus.WaitingToStart) {
        if (t.startDate) {
          // Admin đã chọn ngày bắt đầu tường minh → tôn trọng khoảng ngày Admin set,
          // chỉ chuyển trạng thái (giữ nguyên startDate + deadline hiện có).
          await this.prisma.topic.update({
            where: { id: t.id },
            data: { status: TopicStatus.InProgress },
          });
        } else {
          // Chưa có ngày bắt đầu → mặc định: hôm nay + durationMonths.
          const start = new Date();
          const months = t.durationMonths || 6;
          const deadline = new Date(start);
          deadline.setMonth(deadline.getMonth() + months);
          await this.prisma.topic.update({
            where: { id: t.id },
            data: { status: TopicStatus.InProgress, startDate: start, deadline },
          });
        }
        await this.activities.log(adminId, 'Bắt đầu đề tài', `"${t.topicName}"`, t.id);
        updated++;
      } else if (t.status === TopicStatus.InProgress) {
        await this.prisma.topic.update({
          where: { id: t.id },
          data: { status: TopicStatus.Reporting },
        });
        await this.activities.log(adminId, 'Chuyển sang Báo Cáo', `"${t.topicName}"`, t.id);
        updated++;
      }
      // Reporting / Editing / Done: không proceed thủ công ở đây.
    }
    return { updated };
  }

  // Hoàn tác về trạng thái liền trước trong chuỗi do Admin điều khiển.
  async undo(ids: string[], adminId: string) {
    this.assertIds(ids);
    const back: Partial<Record<TopicStatus, TopicStatus>> = {
      [TopicStatus.InProgress]: TopicStatus.WaitingToStart,
      [TopicStatus.Reporting]: TopicStatus.InProgress,
      [TopicStatus.Editing]: TopicStatus.Reporting,
      // Nghiệm thu (Done) Undo phải về thẳng Báo Cáo, KHÔNG quay lại Chỉnh Sửa trong mọi trường hợp
      [TopicStatus.Done]: TopicStatus.Reporting,
    };
    const topics = await this.prisma.topic.findMany({ where: { id: { in: ids } } });
    let updated = 0;
    for (const t of topics) {
      const prev = back[t.status];
      if (!prev) continue;
      const data: any = { status: prev, editDeadline: null };
      // Lùi về "Chờ bắt đầu" thì reset mốc bắt đầu + tiến độ
      if (prev === TopicStatus.WaitingToStart) {
        data.startDate = null;
        data.progress = 0;
      }
      await this.prisma.topic.update({ where: { id: t.id }, data });
      await this.activities.log(adminId, 'Hoàn tác trạng thái', `"${t.topicName}" → ${prev}`, t.id);
      updated++;
    }
    return { updated };
  }

  // Mở trạng thái Chỉnh Sửa cho các đề tài đang Báo Cáo, set hạn chỉnh sửa.
  // Hết hạn sẽ tự chuyển Nghiệm thu (xử lý lazy lúc fetch).
  async startEditing(ids: string[], editDeadline: string, adminId: string) {
    this.assertIds(ids);
    const dl = new Date(editDeadline);
    if (!editDeadline || isNaN(dl.getTime())) throw new BadRequestException('Thời gian chỉnh sửa không hợp lệ');
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: ids }, status: TopicStatus.Reporting },
    });
    let updated = 0;
    for (const t of topics) {
      await this.prisma.topic.update({
        where: { id: t.id },
        data: { status: TopicStatus.Editing, editDeadline: dl },
      });
      await this.activities.log(
        adminId, 'Mở chỉnh sửa',
        `"${t.topicName}" đến ${dl.toLocaleString('vi-VN')}`, t.id,
      );
      updated++;
    }
    return { updated };
  }

  // Đặt lịch bắt đầu HÀNG LOẠT cho các đề tài "Chờ bắt đầu".
  // Set startDate (+ deadline). Khi tới ngày bắt đầu, đề tài tự nhảy sang "Đang thực hiện"
  // (xử lý lazy trong decorateTopics). Nếu chọn ngày bắt đầu là hôm nay/quá khứ → bắt đầu ngay lần fetch sau.
  async scheduleStart(ids: string[], startDate: string, endDate: string | undefined, adminId: string) {
    this.assertIds(ids);
    const start = new Date(startDate);
    if (!startDate || isNaN(start.getTime())) throw new BadRequestException('Ngày bắt đầu không hợp lệ');

    let end: Date | null = null;
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) throw new BadRequestException('Ngày kết thúc không hợp lệ');
      if (end <= start) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    // Chỉ áp cho đề tài đang "Chờ bắt đầu"
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: ids }, status: TopicStatus.WaitingToStart },
    });
    let updated = 0;
    for (const t of topics) {
      // deadline: dùng ngày kết thúc tường minh, nếu không có thì = startDate + durationMonths
      let deadline = end;
      if (!deadline) {
        deadline = new Date(start);
        deadline.setMonth(deadline.getMonth() + (t.durationMonths || 6));
      }
      const data: any = { startDate: start, deadline };
      // Đồng bộ durationMonths khi Admin chọn khoảng ngày tường minh (để các luồng khác dùng nhất quán)
      if (end) {
        const ms = end.getTime() - start.getTime();
        if (ms > 0) data.durationMonths = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30.44)));
      }
      await this.prisma.topic.update({ where: { id: t.id }, data });
      await this.activities.log(
        adminId, 'Đặt lịch bắt đầu',
        `"${t.topicName}" bắt đầu ${start.toLocaleDateString('vi-VN')}`, t.id,
      );
      updated++;
    }
    return { updated };
  }

  // Lazy: với danh sách đề tài, tự chuyển Editing đã hết hạn → Done,
  // và gắn cờ isLate (InProgress đã quá deadline) để FE hiển thị badge "Trễ".
  private async decorateTopics<T extends { id: string; status: TopicStatus; startDate?: Date | null; deadline?: Date | null; editDeadline?: Date | null }>(topics: T[]): Promise<(T & { isLate: boolean })[]> {
    const now = new Date();

    // Auto-start: "Chờ bắt đầu" + đã tới ngày bắt đầu Admin/GV đặt → "Đang thực hiện".
    // (startDate ở trạng thái WaitingToStart chỉ có khi được đặt tường minh, nên flip an toàn.)
    const toStart = topics.filter(
      t => t.status === TopicStatus.WaitingToStart && t.startDate && t.startDate <= now,
    );
    if (toStart.length) {
      await this.prisma.topic.updateMany({
        where: { id: { in: toStart.map(t => t.id) } },
        data: { status: TopicStatus.InProgress },
      });
      for (const t of toStart) t.status = TopicStatus.InProgress;
    }

    // Editing đã hết hạn → Nghiệm thu (Done)
    const expired = topics.filter(
      t => t.status === TopicStatus.Editing && t.editDeadline && t.editDeadline < now,
    );
    if (expired.length) {
      await this.prisma.topic.updateMany({
        where: { id: { in: expired.map(t => t.id) } },
        data: { status: TopicStatus.Done },
      });
      for (const t of expired) t.status = TopicStatus.Done;
    }
    return topics.map(t => ({
      ...t,
      isLate: t.status === TopicStatus.InProgress && !!t.deadline && t.deadline < now,
    }));
  }
}
