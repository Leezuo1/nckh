import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicStatus, UserRole, TopicParticipantRole, ApprovalLevel, ApprovalDecision, CouncilType, ReviewOutcome } from '@prisma/client';

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
    // Luồng duyệt SRS: SV đang trong nhóm ở các trạng thái này vẫn coi là "đang dính"
    TopicStatus.Draft,
    TopicStatus.PendingFacultyReview,
    TopicStatus.FacultyRevision,
    TopicStatus.PendingDepartmentReview,
    TopicStatus.DepartmentRevision,
    TopicStatus.PendingProposalCouncil,
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
        // onlyUnassigned: đề tài đã duyệt (Khoa+Phòng) nhưng còn thiếu người → chờ assign
        ...(filters?.onlyUnassigned && {
          isApproved: true,
          status: TopicStatus.PendingAssign,
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
          // Là participant ở bất kỳ đề tài nào (mọi vai trò: Supervisor/Leader/Member/PendingMember/Invited)
          { topicParticipant: { some: { userId } } },
          // Là người tạo/đăng (GVHD tạo nhóm hoặc SV/GV đăng ý tưởng)
          { submitterId: userId },
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
        proposalVersions: { orderBy: { version: 'desc' } },
        approvalRecords: { orderBy: { created: 'desc' } },
        councils: { orderBy: { created: 'desc' } },
      },
    });

    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    // Gắn tên người duyệt vào từng bản ghi duyệt (reviewerId là raw ObjectId, không có relation)
    if (topic.approvalRecords?.length) {
      const reviewerIds = [...new Set(topic.approvalRecords.map(a => a.reviewerId).filter(Boolean))] as string[];
      const reviewers = await this.prisma.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, fullName: true, role: true },
      });
      const byId = Object.fromEntries(reviewers.map(u => [u.id, u]));
      (topic as any).approvalRecords = topic.approvalRecords.map(a => ({
        ...a,
        reviewer: a.reviewerId ? byId[a.reviewerId] || null : null,
      }));
    }
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
        isApproved: false,
        status: TopicStatus.PendingFacultyReview, // vào thẳng chuỗi duyệt Khoa → Phòng
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
          ...((topic.status === TopicStatus.Pending || topic.status === TopicStatus.PendingAssign) && {
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
    await this.prisma.proposalVersion.deleteMany({ where: { topicId: id } });
    await this.prisma.approvalRecord.deleteMany({ where: { topicId: id } });
    await this.prisma.council.deleteMany({ where: { topicId: id } });
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

  // ===================================================================
  // ===== LUỒNG SRS: NHÓM (GVHD) → HỒ SƠ → DUYỆT NHIỀU CẤP ============
  // ===================================================================

  private readonly GROUP_ROLES: TopicParticipantRole[] = [
    TopicParticipantRole.Supervisor,
    TopicParticipantRole.Leader,
    TopicParticipantRole.Member,
  ];

  // Include chuẩn cho đề tài luồng SRS (dùng cho queue/detail)
  private readonly SRS_INCLUDE = {
    submitter: { select: { fullName: true, userId: true, faculty: true } },
    topicParticipant: {
      include: { user: { select: { fullName: true, userId: true, role: true, faculty: true } } },
    },
  };

  // Đề tài + kiểm tra người gọi là GVHD hướng dẫn (Supervisor) hoặc Admin
  private async assertSupervisor(topicId: string, userId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { topicParticipant: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const me = topic.topicParticipant.find(p => p.userId === userId);
    const isSupervisor = me?.topicParticipantRole === TopicParticipantRole.Supervisor;
    if (!isSupervisor && user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ GVHD hướng dẫn nhóm này mới được thao tác');
    }
    return topic;
  }

  // Đẩy thông báo cho toàn nhóm (Supervisor/Leader/Member)
  private async notifyGroup(topicId: string, title: string, message: string, link?: string) {
    const members = await this.prisma.topicParticipant.findMany({
      where: { topicId, topicParticipantRole: { in: this.GROUP_ROLES } },
    });
    for (const m of members) {
      if (m.userId) await this.notifications.create(m.userId, title, message, link);
    }
  }

  // FR-07: GVHD tạo nhóm nghiên cứu (đề tài ở trạng thái Nháp)
  async createGroup(dto: CreateTopicDto, lecturerId: string) {
    const lecturer = await this.prisma.user.findUnique({ where: { id: lecturerId } });
    if (lecturer?.role !== UserRole.Lecturer && lecturer?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ giảng viên (GVHD) mới được tạo nhóm nghiên cứu');
    }
    const { durationMonths, ...rest } = dto;
    const created = await this.prisma.topic.create({
      data: {
        ...rest,
        durationMonths,
        isAssigned: false,
        isApproved: false,
        status: TopicStatus.Draft,
        submitterId: lecturerId,
        deadline: new Date(dto.deadline),
      },
    });
    // GVHD là người hướng dẫn (Supervisor)
    await this.prisma.topicParticipant.create({
      data: { topicId: created.id, userId: lecturerId, topicParticipantRole: TopicParticipantRole.Supervisor },
    });
    await this.activities.log(lecturerId, 'Tạo nhóm nghiên cứu', `"${dto.topicName}"`, created.id);
    return created;
  }

  // FR-07: GVHD mời sinh viên theo MSSV
  async inviteStudent(topicId: string, mssv: string, lecturerId: string) {
    const topic = await this.assertSupervisor(topicId, lecturerId);
    if (!mssv) throw new BadRequestException('Thiếu MSSV');
    const student = await this.prisma.user.findUnique({ where: { userId: mssv } });
    if (!student) throw new NotFoundException(`Không tìm thấy sinh viên có MSSV ${mssv}`);
    if (student.role !== UserRole.Student) throw new BadRequestException('Chỉ mời được tài khoản sinh viên');

    const exists = topic.topicParticipant.find(p => p.userId === student.id);
    if (exists) throw new ForbiddenException('Sinh viên này đã ở trong nhóm hoặc đã được mời');

    // Mỗi SV chỉ theo 1 đề tài
    const active = await this.findStudentActiveTopic(student.id, topicId);
    if (active) {
      throw new ForbiddenException(`${student.fullName} đang ở đề tài "${active.topicName}" nên không thể mời`);
    }

    const created = await this.prisma.topicParticipant.create({
      data: { topicId, userId: student.id, topicParticipantRole: TopicParticipantRole.Invited },
    });
    await this.notifications.create(
      student.id,
      'Lời mời tham gia nhóm nghiên cứu',
      `GVHD mời bạn tham gia đề tài "${topic.topicName}"`,
      `/de-tai-cua-toi`,
      'group_invite',
      { topicId, topicName: topic.topicName },
    );
    await this.activities.log(lecturerId, 'Mời SV vào nhóm', `${student.fullName} → "${topic.topicName}"`, topicId);
    return created;
  }

  // GVHD gỡ 1 SV (đã mời hoặc là thành viên) khỏi nhóm
  async removeInvite(topicId: string, userId: string, lecturerId: string) {
    await this.assertSupervisor(topicId, lecturerId);
    await this.prisma.topicParticipant.deleteMany({
      where: {
        topicId,
        userId,
        topicParticipantRole: { in: [TopicParticipantRole.Invited, TopicParticipantRole.Member] },
      },
    });
    return { success: true };
  }

  // FR-08: SV chấp nhận / từ chối lời mời
  async respondInvite(topicId: string, userId: string, accept: boolean) {
    if (typeof accept !== 'boolean') throw new BadRequestException('Thiếu hành động chấp nhận/từ chối');
    const inv = await this.prisma.topicParticipant.findUnique({
      where: { topicId_userId: { topicId, userId } },
    });
    if (!inv || inv.topicParticipantRole !== TopicParticipantRole.Invited) {
      throw new NotFoundException('Không có lời mời tham gia nào cho bạn ở đề tài này');
    }
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { topicParticipant: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const me = await this.prisma.user.findUnique({ where: { id: userId } });

    if (accept) {
      // Mỗi SV chỉ theo 1 đề tài (trừ chính đề tài này)
      const active = await this.findStudentActiveTopic(userId, topicId);
      if (active) throw new ForbiddenException(`Bạn đang ở đề tài "${active.topicName}"`);

      // SV đầu tiên chấp nhận → Chủ nhiệm (Leader); còn lại → Member
      const hasLeader = topic.topicParticipant.some(p => p.topicParticipantRole === TopicParticipantRole.Leader);
      const newRole = hasLeader ? TopicParticipantRole.Member : TopicParticipantRole.Leader;
      await this.prisma.topicParticipant.update({
        where: { id: inv.id },
        data: { topicParticipantRole: newRole },
      });
      // Báo GVHD
      const supervisor = topic.topicParticipant.find(p => p.topicParticipantRole === TopicParticipantRole.Supervisor);
      if (supervisor?.userId) {
        await this.notifications.create(
          supervisor.userId,
          'Sinh viên đã tham gia nhóm',
          `${me?.fullName || 'Sinh viên'} đã chấp nhận tham gia đề tài "${topic.topicName}"`,
          `/de-tai-cua-toi/${topicId}`,
        );
      }
      await this.activities.log(userId, 'Chấp nhận vào nhóm', `"${topic.topicName}"`, topicId);
      return { accepted: true, role: newRole };
    } else {
      await this.prisma.topicParticipant.delete({ where: { id: inv.id } });
      const supervisor = topic.topicParticipant.find(p => p.topicParticipantRole === TopicParticipantRole.Supervisor);
      if (supervisor?.userId) {
        await this.notifications.create(
          supervisor.userId,
          'Sinh viên từ chối lời mời',
          `${me?.fullName || 'Sinh viên'} đã từ chối tham gia đề tài "${topic.topicName}"`,
        );
      }
      return { accepted: false };
    }
  }

  // FR-10/11: Nhóm soạn/nộp thuyết minh → tạo 1 phiên bản mới
  async saveProposal(topicId: string, content: any, note: string | undefined, userId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { topicParticipant: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const me = topic.topicParticipant.find(p => p.userId === userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isGroupMember = me && this.GROUP_ROLES.includes(me.topicParticipantRole);
    if (!isGroupMember && user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ thành viên nhóm mới được soạn thuyết minh');
    }
    const last = await this.prisma.proposalVersion.findFirst({
      where: { topicId },
      orderBy: { version: 'desc' },
    });
    const version = (last?.version || 0) + 1;
    const pv = await this.prisma.proposalVersion.create({
      data: { topicId, version, content: content ?? {}, submittedById: userId, note },
    });
    await this.prisma.topic.update({
      where: { id: topicId },
      data: { currentProposalVersion: version },
    });
    await this.activities.log(userId, 'Lưu thuyết minh', `"${topic.topicName}" (v${version})`, topicId);
    return pv;
  }

  async getProposalVersions(topicId: string) {
    return this.prisma.proposalVersion.findMany({
      where: { topicId },
      orderBy: { version: 'desc' },
    });
  }

  // Nhóm nộp hồ sơ lên cấp duyệt kế tiếp (GVHD trình Khoa / nộp lại sau khi bị trả).
  async submitForReview(topicId: string, userId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: { topicParticipant: true },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const me = topic.topicParticipant.find(p => p.userId === userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const canSubmit =
      me?.topicParticipantRole === TopicParticipantRole.Supervisor ||
      me?.topicParticipantRole === TopicParticipantRole.Leader ||
      user?.role === UserRole.Admin;
    if (!canSubmit) {
      throw new ForbiddenException('Chỉ GVHD hoặc chủ nhiệm đề tài mới được nộp hồ sơ');
    }
    if (!topic.currentProposalVersion) {
      throw new BadRequestException('Cần soạn thuyết minh trước khi nộp');
    }

    // Xác định trạng thái đích theo trạng thái hiện tại
    let next: TopicStatus;
    if (topic.status === TopicStatus.Draft || topic.status === TopicStatus.FacultyRevision) {
      next = TopicStatus.PendingFacultyReview; // trình / nộp lại cho Khoa
    } else if (topic.status === TopicStatus.DepartmentRevision) {
      next = TopicStatus.PendingDepartmentReview; // nộp lại cho Phòng
    } else {
      throw new BadRequestException('Đề tài không ở trạng thái có thể nộp duyệt');
    }

    // Rời Nháp = GVHD duyệt sơ bộ (ghi 1 bản ghi cấp Supervisor)
    if (topic.status === TopicStatus.Draft) {
      await this.prisma.approvalRecord.create({
        data: { topicId, level: ApprovalLevel.Supervisor, decision: ApprovalDecision.Approved, comment: 'GVHD duyệt sơ bộ & trình Khoa', reviewerId: userId },
      });
    }

    const updated = await this.prisma.topic.update({ where: { id: topicId }, data: { status: next } });
    await this.notifyGroup(topicId, 'Đã nộp hồ sơ duyệt', `Đề tài "${topic.topicName}" đã được nộp lên cấp duyệt.`, `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(userId, 'Nộp hồ sơ duyệt', `"${topic.topicName}" → ${next}`, topicId);
    return updated;
  }

  // FR-13/14/15/16: Cán bộ Khoa/Phòng duyệt Đạt/Không đạt (kèm nhận xét)
  async review(topicId: string, reviewerId: string, decision: ApprovalDecision, comment?: string) {
    if (decision !== ApprovalDecision.Approved && decision !== ApprovalDecision.Rejected) {
      throw new BadRequestException('Quyết định duyệt không hợp lệ');
    }
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId } });
    const isAdmin = reviewer?.role === UserRole.Admin;

    let level: ApprovalLevel;
    let next: TopicStatus;
    if (topic.status === TopicStatus.PendingFacultyReview) {
      if (reviewer?.role !== UserRole.FacultyOfficer && !isAdmin) {
        throw new ForbiddenException('Chỉ Cán bộ NCKH Khoa mới được duyệt ở bước này');
      }
      level = ApprovalLevel.Faculty;
      next = decision === ApprovalDecision.Approved ? TopicStatus.PendingDepartmentReview : TopicStatus.FacultyRevision;
    } else if (topic.status === TopicStatus.PendingDepartmentReview) {
      if (reviewer?.role !== UserRole.DepartmentOfficer && !isAdmin) {
        throw new ForbiddenException('Chỉ Cán bộ Phòng NCKH mới được duyệt ở bước này');
      }
      level = ApprovalLevel.Department;
      if (decision === ApprovalDecision.Rejected) {
        next = TopicStatus.DepartmentRevision;
      } else {
        // Phòng Đạt: đủ người (có GVHD + có SV) → Chờ bắt đầu; thiếu người → chờ assign.
        // Tính cả submitter (người đăng ý tưởng) lẫn participant.
        const parts = await this.prisma.topicParticipant.findMany({ where: { topicId } });
        const submitter = topic.submitterId
          ? await this.prisma.user.findUnique({ where: { id: topic.submitterId }, select: { role: true } })
          : null;
        const hasSup =
          parts.some(p => p.topicParticipantRole === TopicParticipantRole.Supervisor) ||
          submitter?.role === UserRole.Lecturer || submitter?.role === UserRole.Admin;
        const hasStu =
          parts.some(p => p.topicParticipantRole === TopicParticipantRole.Leader || p.topicParticipantRole === TopicParticipantRole.Member) ||
          submitter?.role === UserRole.Student;
        next = (hasSup && hasStu) ? TopicStatus.WaitingToStart : TopicStatus.PendingAssign;
      }
    } else {
      throw new BadRequestException('Đề tài không ở trạng thái chờ duyệt');
    }

    if (decision === ApprovalDecision.Rejected && !comment) {
      throw new BadRequestException('Cần nhập nhận xét khi trả về chỉnh sửa');
    }

    await this.prisma.approvalRecord.create({
      data: { topicId, level, decision, comment, reviewerId },
    });
    const data: any = { status: next };
    // Phòng Đạt: đánh dấu đã duyệt; nếu đủ người thì cũng đánh dấu đã assign
    if (level === ApprovalLevel.Department && decision === ApprovalDecision.Approved) {
      data.isApproved = true;
      if (next === TopicStatus.WaitingToStart) data.isAssigned = true;
    }
    const updated = await this.prisma.topic.update({ where: { id: topicId }, data });

    const levelLabel = level === ApprovalLevel.Faculty ? 'Cán bộ NCKH Khoa' : 'Cán bộ Phòng NCKH';
    const verdict = decision === ApprovalDecision.Approved ? 'ĐẠT' : 'trả về chỉnh sửa';
    await this.notifyGroup(
      topicId,
      `Kết quả duyệt (${levelLabel})`,
      `${levelLabel} đã duyệt đề tài "${topic.topicName}": ${verdict}.` + (comment ? ` Nhận xét: ${comment}` : ''),
      `/de-tai-cua-toi/${topicId}`,
    );
    await this.activities.log(reviewerId, `Duyệt cấp ${levelLabel}`, `"${topic.topicName}": ${verdict}`, topicId);
    return updated;
  }

  async getApprovals(topicId: string) {
    const records = await this.prisma.approvalRecord.findMany({
      where: { topicId },
      orderBy: { created: 'desc' },
    });
    const reviewerIds = [...new Set(records.map(r => r.reviewerId).filter(Boolean))] as string[];
    const reviewers = await this.prisma.user.findMany({
      where: { id: { in: reviewerIds } },
      select: { id: true, fullName: true, role: true },
    });
    const byId = Object.fromEntries(reviewers.map(u => [u.id, u]));
    return records.map(r => ({ ...r, reviewer: r.reviewerId ? byId[r.reviewerId] || null : null }));
  }

  // Việc Cán bộ Phòng phụ trách: duyệt hồ sơ cấp Phòng + Hội đồng đề cương/phản biện + nghiệm thu
  // Cán bộ Khoa điều hành nhiều bước: duyệt hồ sơ, cấp GVHD, set giờ, duyệt yêu cầu báo cáo, lập hội đồng, nhập điểm
  private readonly FACULTY_QUEUE: TopicStatus[] = [
    TopicStatus.PendingFacultyReview,
    TopicStatus.PendingAssign,
    TopicStatus.WaitingToStart,
    TopicStatus.InProgress,
    TopicStatus.ReportPendingFaculty,
    TopicStatus.ReportApproved,
    TopicStatus.Reporting,
    TopicStatus.Editing,
  ];
  private readonly DEPARTMENT_QUEUE: TopicStatus[] = [
    TopicStatus.PendingDepartmentReview,
    TopicStatus.ReportPendingDepartment,
  ];

  // Hàng chờ duyệt theo vai trò người gọi
  async getReviewQueue(user: any) {
    let statuses: TopicStatus[];
    if (user.role === UserRole.FacultyOfficer) {
      statuses = this.FACULTY_QUEUE;
    } else if (user.role === UserRole.DepartmentOfficer) {
      statuses = this.DEPARTMENT_QUEUE;
    } else if (user.role === UserRole.Admin) {
      statuses = [...this.FACULTY_QUEUE, ...this.DEPARTMENT_QUEUE];
    } else {
      throw new ForbiddenException('Bạn không có quyền xem hàng chờ duyệt');
    }
    const topics = await this.prisma.topic.findMany({
      where: { status: { in: statuses } },
      include: this.SRS_INCLUDE,
      orderBy: { id: 'desc' },
    });
    return this.decorateTopics(topics);
  }

  // ===== HỘI ĐỒNG (FR-17→20) — Cán bộ Phòng nhập kết quả =====

  private async assertDepartmentOfficer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== UserRole.DepartmentOfficer && user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ Cán bộ Phòng NCKH mới được thao tác Hội đồng');
    }
  }

  // Nhập kết quả Hội đồng ĐỀ CƯƠNG: Đạt → giao đề tài (thực hiện); Không đạt → làm lại đề cương
  async recordProposalCouncil(
    topicId: string,
    body: { decision: ApprovalDecision; note?: string; members?: any; scheduledAt?: string; location?: string },
    officerId: string,
  ) {
    await this.assertDepartmentOfficer(officerId);
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    if (topic.status !== TopicStatus.PendingProposalCouncil) {
      throw new BadRequestException('Đề tài không ở bước Hội đồng đề cương');
    }

    await this.prisma.council.create({
      data: {
        topicId, type: CouncilType.Proposal,
        members: body.members ?? undefined,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        location: body.location, decision: body.decision, note: body.note, createdById: officerId,
      },
    });

    let updated;
    if (body.decision === ApprovalDecision.Approved) {
      // Giao đề tài: bắt đầu thực hiện, deadline = hôm nay + durationMonths
      const start = new Date();
      const deadline = new Date(start);
      deadline.setMonth(deadline.getMonth() + (topic.durationMonths || 6));
      updated = await this.prisma.topic.update({
        where: { id: topicId },
        data: { status: TopicStatus.InProgress, isAssigned: true, startDate: start, deadline },
      });
      await this.notifyGroup(topicId, 'Đề tài được giao', `Hội đồng đề cương ĐẠT — đề tài "${topic.topicName}" bắt đầu thực hiện.`, `/de-tai-cua-toi/${topicId}`);
    } else {
      updated = await this.prisma.topic.update({ where: { id: topicId }, data: { status: TopicStatus.Draft } });
      await this.notifyGroup(topicId, 'Hội đồng đề cương: làm lại', `Đề tài "${topic.topicName}" cần làm lại đề cương.` + (body.note ? ` Nhận xét: ${body.note}` : ''), `/de-tai-cua-toi/${topicId}`);
    }
    await this.activities.log(officerId, 'Nhập kết quả Hội đồng đề cương', `"${topic.topicName}": ${body.decision}`, topicId);
    return updated;
  }

  // Nhập kết quả Hội đồng PHẢN BIỆN / nghiệm thu.
  // Đạt → Nghiệm thu (Done). Không đạt → outcome: Gia hạn / Làm lại / Huỷ.
  async recordReviewCouncil(
    topicId: string,
    body: { decision: ApprovalDecision; outcome?: ReviewOutcome; note?: string; members?: any; scheduledAt?: string; location?: string },
    officerId: string,
  ) {
    await this.assertDepartmentOfficer(officerId);
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const allowed: TopicStatus[] = [TopicStatus.InProgress, TopicStatus.Reporting, TopicStatus.Editing, TopicStatus.PendingReviewCouncil];
    if (!allowed.includes(topic.status)) {
      throw new BadRequestException('Đề tài chưa ở giai đoạn nghiệm thu');
    }
    if (body.decision === ApprovalDecision.Rejected && !body.outcome) {
      throw new BadRequestException('Không đạt: cần chọn Gia hạn / Làm lại / Huỷ');
    }

    await this.prisma.council.create({
      data: {
        topicId, type: CouncilType.Review,
        members: body.members ?? undefined,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        location: body.location, decision: body.decision, note: body.note,
        outcome: body.decision === ApprovalDecision.Rejected ? body.outcome : undefined,
        createdById: officerId,
      },
    });

    let data: any;
    let msg: string;
    if (body.decision === ApprovalDecision.Approved) {
      data = { status: TopicStatus.Done };
      msg = `Đề tài "${topic.topicName}" đã NGHIỆM THU.`;
    } else if (body.outcome === ReviewOutcome.Extend) {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + (topic.durationMonths || 6));
      data = { status: TopicStatus.InProgress, deadline };
      msg = `Đề tài "${topic.topicName}" được GIA HẠN thực hiện.`;
    } else if (body.outcome === ReviewOutcome.Redo) {
      data = { status: TopicStatus.Draft };
      msg = `Đề tài "${topic.topicName}" phải LÀM LẠI đề cương.`;
    } else {
      data = { status: TopicStatus.Cancelled };
      msg = `Đề tài "${topic.topicName}" đã bị HUỶ.`;
    }
    const updated = await this.prisma.topic.update({ where: { id: topicId }, data });
    await this.notifyGroup(topicId, 'Kết quả Hội đồng nghiệm thu', msg + (body.note ? ` Nhận xét: ${body.note}` : ''), `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(officerId, 'Nhập kết quả Hội đồng phản biện', `"${topic.topicName}": ${body.decision}${body.outcome ? '/' + body.outcome : ''}`, topicId);
    return updated;
  }

  async getCouncils(topicId: string) {
    return this.prisma.council.findMany({ where: { topicId }, orderBy: { created: 'desc' } });
  }

  // ===== ĐỢT ĐỀ TÀI (FR-04→06) — Cán bộ Phòng phát động =====

  async createBatch(dto: { name: string; year: string; description?: string; deadline: string }, officerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: officerId } });
    if (user?.role !== UserRole.DepartmentOfficer && user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ Cán bộ Phòng NCKH mới được tạo đợt đề tài');
    }
    const batch = await this.prisma.batch.create({
      data: { name: dto.name, year: dto.year, description: dto.description, deadline: new Date(dto.deadline), createdById: officerId },
    });
    // FR-05: thông báo tất cả GVHD khi có đợt mới
    const lecturers = await this.prisma.user.findMany({
      where: { role: UserRole.Lecturer, status: 'Active' }, select: { id: true },
    });
    for (const l of lecturers) {
      await this.notifications.create(
        l.id, 'Đợt đề tài mới',
        `Phòng NCKH vừa mở đợt "${dto.name}". Hạn nộp hồ sơ: ${new Date(dto.deadline).toLocaleDateString('vi-VN')}.`,
        `/dang-ky-y-tuong`,
      );
    }
    return batch;
  }

  async getBatches() {
    return this.prisma.batch.findMany({ orderBy: { created: 'desc' } });
  }

  async toggleBatch(id: string, officerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: officerId } });
    if (user?.role !== UserRole.DepartmentOfficer && user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ Cán bộ Phòng NCKH mới được đóng/mở đợt');
    }
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy đợt đề tài');
    return this.prisma.batch.update({ where: { id }, data: { isOpen: !batch.isOpen } });
  }

  // ===== BÁO CÁO THỐNG KÊ (FR-26→28) =====
  async getReportStats() {
    const topics = await this.prisma.topic.findMany({
      where: { status: { not: TopicStatus.Pending } }, // bỏ ý tưởng chưa duyệt (luồng cũ)
      include: { topicParticipant: { include: { user: { select: { fullName: true } } } } },
    });
    const byStatus: Record<string, number> = {};
    const bySup: Record<string, number> = {};
    for (const t of topics) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      const sup = t.topicParticipant.find(p => p.topicParticipantRole === TopicParticipantRole.Supervisor);
      if (sup?.user?.fullName) bySup[sup.user.fullName] = (bySup[sup.user.fullName] || 0) + 1;
    }
    const done = byStatus[TopicStatus.Done] || 0;
    const cancelled = byStatus[TopicStatus.Cancelled] || 0;
    const finished = done + cancelled;
    return {
      total: topics.length,
      done,
      cancelled,
      inProgress: (byStatus[TopicStatus.InProgress] || 0) + (byStatus[TopicStatus.Reporting] || 0) + (byStatus[TopicStatus.Editing] || 0),
      passRate: finished ? Math.round((done / finished) * 100) : 0,
      byStatus,
      bySupervisor: Object.entries(bySup).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }

  // ===== PHA 2: Cán bộ Khoa cấp GVHD cho ý tưởng SV thiếu người =====
  async listLecturers() {
    return this.prisma.user.findMany({
      where: { role: UserRole.Lecturer, status: 'Active' },
      select: { id: true, fullName: true, userId: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async assignSupervisor(topicId: string, lecturerId: string, officerId: string) {
    const officer = await this.prisma.user.findUnique({ where: { id: officerId } });
    if (officer?.role !== UserRole.FacultyOfficer && officer?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ Cán bộ NCKH Khoa mới được cấp GVHD');
    }
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId }, include: { submitter: true } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    if (topic.status !== TopicStatus.PendingAssign) throw new BadRequestException('Đề tài không ở trạng thái chờ assign');
    const lecturer = await this.prisma.user.findUnique({ where: { id: lecturerId } });
    if (lecturer?.role !== UserRole.Lecturer) throw new BadRequestException('Chỉ chọn được tài khoản giảng viên');

    await this.prisma.topicParticipant.upsert({
      where: { topicId_userId: { topicId, userId: lecturerId } },
      create: { topicId, userId: lecturerId, topicParticipantRole: TopicParticipantRole.Supervisor },
      update: { topicParticipantRole: TopicParticipantRole.Supervisor },
    });
    if (topic.submitterId && topic.submitter?.role === UserRole.Student) {
      await this.prisma.topicParticipant.upsert({
        where: { topicId_userId: { topicId, userId: topic.submitterId } },
        create: { topicId, userId: topic.submitterId, topicParticipantRole: TopicParticipantRole.Leader },
        update: {},
      });
    }
    const updated = await this.prisma.topic.update({
      where: { id: topicId }, data: { status: TopicStatus.WaitingToStart, isAssigned: true },
    });
    await this.notifications.create(lecturerId, 'Được phân công hướng dẫn', `Bạn được Cán bộ Khoa phân công hướng dẫn đề tài "${topic.topicName}"`, `/de-tai-cua-toi/${topicId}`);
    await this.notifyGroup(topicId, 'Đã có GVHD', `Đề tài "${topic.topicName}" đã được cấp GVHD → Chờ bắt đầu.`, `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(officerId, 'Cấp GVHD', `${lecturer.fullName} → "${topic.topicName}"`, topicId);
    return updated;
  }

  // ===== PHA 4: Yêu cầu báo cáo (chuỗi Khoa → Phòng) =====
  async requestReport(topicId: string, userId: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId }, include: { topicParticipant: true } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const me = topic.topicParticipant.find(p => p.userId === userId);
    const canReq = me?.topicParticipantRole === TopicParticipantRole.Supervisor || me?.topicParticipantRole === TopicParticipantRole.Leader;
    if (!canReq) throw new ForbiddenException('Chỉ GVHD hoặc chủ nhiệm được xin báo cáo');
    if (topic.status !== TopicStatus.InProgress) throw new BadRequestException('Đề tài chưa ở giai đoạn thực hiện');
    const updated = await this.prisma.topic.update({ where: { id: topicId }, data: { status: TopicStatus.ReportPendingFaculty } });
    await this.notifyGroup(topicId, 'Đã gửi yêu cầu báo cáo', `Đề tài "${topic.topicName}" đã gửi yêu cầu báo cáo lên Cán bộ Khoa.`, `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(userId, 'Xin báo cáo', `"${topic.topicName}"`, topicId);
    return updated;
  }

  async reviewReport(topicId: string, reviewerId: string, decision: ApprovalDecision) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId } });
    const isAdmin = reviewer?.role === UserRole.Admin;
    let next: TopicStatus;
    let label: string;
    if (topic.status === TopicStatus.ReportPendingFaculty) {
      if (reviewer?.role !== UserRole.FacultyOfficer && !isAdmin) throw new ForbiddenException('Chỉ Cán bộ Khoa duyệt bước này');
      next = decision === ApprovalDecision.Approved ? TopicStatus.ReportPendingDepartment : TopicStatus.InProgress;
      label = 'Cán bộ Khoa';
    } else if (topic.status === TopicStatus.ReportPendingDepartment) {
      if (reviewer?.role !== UserRole.DepartmentOfficer && !isAdmin) throw new ForbiddenException('Chỉ Cán bộ Phòng duyệt bước này');
      next = decision === ApprovalDecision.Approved ? TopicStatus.ReportApproved : TopicStatus.InProgress;
      label = 'Cán bộ Phòng';
    } else {
      throw new BadRequestException('Đề tài không ở bước duyệt yêu cầu báo cáo');
    }
    const updated = await this.prisma.topic.update({ where: { id: topicId }, data: { status: next } });
    const verdict = decision === ApprovalDecision.Approved ? 'chấp nhận' : 'từ chối (tiếp tục thực hiện)';
    await this.notifyGroup(topicId, `Yêu cầu báo cáo (${label})`, `${label} đã ${verdict} yêu cầu báo cáo đề tài "${topic.topicName}".`, `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(reviewerId, `Duyệt yêu cầu báo cáo (${label})`, `"${topic.topicName}": ${verdict}`, topicId);
    return updated;
  }

  // Cán bộ Khoa lập hội đồng (thành viên là tài khoản GVHD) → đề tài vào Báo cáo (khoá)
  async createReportCouncil(topicId: string, body: { lecturerIds: string[]; scheduledAt?: string; location?: string }, officerId: string) {
    const officer = await this.prisma.user.findUnique({ where: { id: officerId } });
    if (officer?.role !== UserRole.FacultyOfficer && officer?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ Cán bộ NCKH Khoa mới được lập hội đồng');
    }
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    if (topic.status !== TopicStatus.ReportApproved) throw new BadRequestException('Đề tài chưa được Phòng duyệt yêu cầu báo cáo');
    if (!body.lecturerIds?.length) throw new BadRequestException('Chọn ít nhất 1 giảng viên vào hội đồng');

    const members = await this.prisma.user.findMany({
      where: { id: { in: body.lecturerIds }, role: UserRole.Lecturer },
      select: { id: true, fullName: true },
    });
    await this.prisma.council.create({
      data: {
        topicId, type: CouncilType.Review,
        members: members as any,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        location: body.location, createdById: officerId,
      },
    });
    const updated = await this.prisma.topic.update({ where: { id: topicId }, data: { status: TopicStatus.Reporting } });
    for (const m of members) {
      await this.notifications.create(m.id, 'Được thêm vào hội đồng', `Bạn là thành viên hội đồng báo cáo đề tài "${topic.topicName}"`, `/de-tai-cua-toi/${topicId}`);
    }
    await this.notifyGroup(topicId, 'Lập hội đồng báo cáo', `Đề tài "${topic.topicName}" đã có hội đồng, chuyển sang Báo cáo (khoá chỉnh sửa).`, `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(officerId, 'Lập hội đồng báo cáo', `"${topic.topicName}" (${members.length} GV)`, topicId);
    return updated;
  }

  // Cán bộ Khoa nhập điểm + mở giai đoạn Chỉnh sửa (đếm ngược → tự Nghiệm thu)
  async enterScore(topicId: string, body: { score: number; editDeadline: string }, officerId: string) {
    const officer = await this.prisma.user.findUnique({ where: { id: officerId } });
    if (officer?.role !== UserRole.FacultyOfficer && officer?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ Cán bộ NCKH Khoa mới được nhập điểm');
    }
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    if (topic.status !== TopicStatus.Reporting) throw new BadRequestException('Đề tài không ở giai đoạn Báo cáo');
    const dl = new Date(body.editDeadline);
    if (!body.editDeadline || isNaN(dl.getTime())) throw new BadRequestException('Thời gian chỉnh sửa không hợp lệ');
    if (typeof body.score !== 'number' || !Number.isFinite(body.score)) throw new BadRequestException('Điểm không hợp lệ');

    const updated = await this.prisma.topic.update({
      where: { id: topicId },
      data: { score: body.score, status: TopicStatus.Editing, editDeadline: dl },
    });
    await this.notifyGroup(topicId, 'Đã có điểm + mở chỉnh sửa', `Đề tài "${topic.topicName}" điểm ${body.score}. Chỉnh sửa đến ${dl.toLocaleString('vi-VN')}, hết giờ tự Nghiệm thu.`, `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(officerId, 'Nhập điểm', `"${topic.topicName}": ${body.score}`, topicId);
    return updated;
  }

  // Huỷ đề tài (Cán bộ NCKH Khoa / Admin) — dừng hẳn đề tài ở bất kỳ giai đoạn nào (trừ đã Nghiệm thu / đã Huỷ)
  async cancelTopic(topicId: string, officerId: string, reason?: string) {
    const officer = await this.prisma.user.findUnique({ where: { id: officerId } });
    if (officer?.role !== UserRole.FacultyOfficer && officer?.role !== UserRole.Admin) {
      throw new ForbiddenException('Chỉ Cán bộ NCKH Khoa mới được huỷ đề tài');
    }
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');
    if (topic.status === TopicStatus.Done) throw new BadRequestException('Đề tài đã nghiệm thu, không thể huỷ');
    if (topic.status === TopicStatus.Cancelled) throw new BadRequestException('Đề tài đã bị huỷ trước đó');

    const updated = await this.prisma.topic.update({ where: { id: topicId }, data: { status: TopicStatus.Cancelled } });
    await this.notifyGroup(topicId, 'Đề tài đã bị huỷ', `Đề tài "${topic.topicName}" đã bị huỷ.${reason ? ' Lý do: ' + reason : ''}`, `/de-tai-cua-toi/${topicId}`);
    await this.activities.log(officerId, 'Huỷ đề tài', `"${topic.topicName}"${reason ? ' — ' + reason : ''}`, topicId);
    return updated;
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
