import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { TopicStatus, UserRole, ApprovalDecision, ReviewOutcome } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  // ===== ĐỀ TÀI =====

  // GET /api/topics?status=InProgress&year=2026&search=AI
  @Public()
  @Get('topics')
  findAllTopics(
    @Query('status') status?: TopicStatus,
    @Query('year') year?: string,
    @Query('search') search?: string,
  ) {
    return this.topicsService.findAllTopics({
      status,
      year: year || undefined,
      search,
    });
  }

  // GET /api/topics/mine
  @Get('topics/mine')
  findMyTopics(@Request() req) {
    return this.topicsService.findMyTopics(req.user.id, req.user.role);
  }

  // GET /api/topics/:id
  @Get('topics/:id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.topicsService.findOne(id, req.user.role);
  }

  // ===== STATE MACHINE (Admin) — đặt TRƯỚC topics/:id để không bị nuốt route =====

  // PATCH /api/topics/proceed  body: { ids: string[] }
  @Patch('topics/proceed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  proceed(@Body('ids') ids: string[], @Request() req) {
    return this.topicsService.proceed(ids, req.user.id);
  }

  // PATCH /api/topics/undo  body: { ids: string[] }
  @Patch('topics/undo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  undo(@Body('ids') ids: string[], @Request() req) {
    return this.topicsService.undo(ids, req.user.id);
  }

  // PATCH /api/topics/start-editing  body: { ids: string[], editDeadline: string }
  @Patch('topics/start-editing')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  startEditing(
    @Body('ids') ids: string[],
    @Body('editDeadline') editDeadline: string,
    @Request() req,
  ) {
    return this.topicsService.startEditing(ids, editDeadline, req.user.id);
  }

  // PATCH /api/topics/schedule-start  body: { ids: string[], startDate: string, endDate?: string }
  @Patch('topics/schedule-start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  scheduleStart(
    @Body('ids') ids: string[],
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Request() req,
  ) {
    return this.topicsService.scheduleStart(ids, startDate, endDate, req.user.id);
  }

  // PATCH /api/topics/:id
  @Patch('topics/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTopicDto,
    @Request() req,
  ) {
    return this.topicsService.update(id, dto, req.user);
  }

  // DELETE /api/topics/:id (Cán bộ NCKH Khoa / Admin)
  @Delete('topics/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }

  // ===== Ý TƯỞNG =====

  // GET /api/ideas?year=2026&search=AI&onlyUnassigned=true&onlyPendingApproval=true
  @Public()
  @Get('ideas')
  findAllIdeas(
    @Query('year') year?: string,
    @Query('search') search?: string,
    @Query('onlyUnassigned') onlyUnassigned?: string,
    @Query('onlyPendingApproval') onlyPendingApproval?: string,
    @Query('onlyApproved') onlyApproved?: string,
  ) {
    return this.topicsService.findAllIdeas({
      year: year || undefined,
      search,
      onlyUnassigned: onlyUnassigned === 'true',
      onlyPendingApproval: onlyPendingApproval === 'true',
      onlyApproved: onlyApproved === 'true',
    });
  }

  // POST /api/ideas (đăng ký ý tưởng)
  @Post('ideas')
  createIdea(@Body() dto: CreateTopicDto, @Request() req) {
    return this.topicsService.createIdea(dto, req.user.id);
  }

  // PATCH /api/ideas/:id/assign (Admin duyệt ý tưởng → đề tài)
  @Patch('ideas/:id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  assignIdea(@Param('id') id: string) {
    return this.topicsService.assignIdea(id);
  }

  // PATCH /api/topics/:id/request-assign (SV/GV xin tham gia đề tài)
  @Patch('topics/:id/request-assign')
  requestAssign(
    @Param('id') id: string,
    @Body('students') students: any[],
    @Request() req,
  ) {
    return this.topicsService.requestAssign(id, req.user.id, students);
  }

  // PATCH /api/topics/:id/lecturer-assign (GV tự nhận ý tưởng SV, không cần duyệt)
  @Patch('topics/:id/lecturer-assign')
  lecturerAssign(
    @Param('id') id: string,
    @Body('durationMonths') durationMonths: number,
    @Request() req,
  ) {
    return this.topicsService.lecturerAssignIdea(id, req.user.id, durationMonths);
  }

  // POST /api/topics/:id/access (ghi nhận lượt truy cập)
  @Post('topics/:id/access')
  recordAccess(@Param('id') id: string, @Request() req) {
    return this.topicsService.recordAccess(id, req.user.id);
  }

  // GET /api/topics/:id/access-stats (thống kê truy cập theo tháng)
  @Get('topics/:id/access-stats')
  getAccessStats(@Param('id') id: string) {
    return this.topicsService.getAccessStats(id);
  }

  // PATCH /api/topics/:id/progress (cập nhật tiến độ - chỉ GV/Leader)
  @Patch('topics/:id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body('progress') progress: number,
    @Request() req,
  ) {
    return this.topicsService.updateProgress(id, progress, req.user.id);
  }

  // PATCH /api/topics/:id/respond-assign (Leader chấp nhận/từ chối)
  @Patch('topics/:id/respond-assign')
  respondAssign(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body('accept') accept: boolean,
    @Request() req,
  ) {
    return this.topicsService.respondAssign(id, userId, accept, req.user);
  }

  // ===== LUỒNG SRS: NHÓM (GVHD) → HỒ SƠ → DUYỆT NHIỀU CẤP =====

  // GET /api/review-queue — hàng chờ duyệt theo vai trò (Khoa/Phòng/Admin)
  @Get('review-queue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.DepartmentOfficer, UserRole.Admin)
  reviewQueue(@Request() req) {
    return this.topicsService.getReviewQueue(req.user);
  }

  // POST /api/topics/group — GVHD tạo nhóm nghiên cứu (đề tài Nháp)
  @Post('topics/group')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Lecturer, UserRole.Admin)
  createGroup(@Body() dto: CreateTopicDto, @Request() req) {
    return this.topicsService.createGroup(dto, req.user.id);
  }

  // POST /api/topics/:id/invite — GVHD mời SV theo MSSV
  @Post('topics/:id/invite')
  inviteStudent(@Param('id') id: string, @Body('mssv') mssv: string, @Request() req) {
    return this.topicsService.inviteStudent(id, mssv, req.user.id);
  }

  // DELETE /api/topics/:id/invite/:userId — GVHD gỡ SV khỏi nhóm
  @Delete('topics/:id/invite/:userId')
  removeInvite(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
    return this.topicsService.removeInvite(id, userId, req.user.id);
  }

  // PATCH /api/topics/:id/respond-invite — SV chấp nhận/từ chối lời mời
  @Patch('topics/:id/respond-invite')
  respondInvite(@Param('id') id: string, @Body('accept') accept: boolean, @Request() req) {
    return this.topicsService.respondInvite(id, req.user.id, accept);
  }

  // PATCH /api/topics/:id/proposal — lưu/nộp 1 phiên bản thuyết minh
  @Patch('topics/:id/proposal')
  saveProposal(
    @Param('id') id: string,
    @Body('content') content: any,
    @Body('note') note: string,
    @Request() req,
  ) {
    return this.topicsService.saveProposal(id, content, note, req.user.id);
  }

  // GET /api/topics/:id/proposal/versions — lịch sử phiên bản thuyết minh
  @Get('topics/:id/proposal/versions')
  proposalVersions(@Param('id') id: string) {
    return this.topicsService.getProposalVersions(id);
  }

  // PATCH /api/topics/:id/submit — nhóm nộp hồ sơ lên cấp duyệt kế tiếp
  @Patch('topics/:id/submit')
  submitForReview(@Param('id') id: string, @Request() req) {
    return this.topicsService.submitForReview(id, req.user.id);
  }

  // PATCH /api/topics/:id/review — Cán bộ Khoa/Phòng duyệt Đạt/Không đạt
  @Patch('topics/:id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.DepartmentOfficer, UserRole.Admin)
  review(
    @Param('id') id: string,
    @Body('decision') decision: ApprovalDecision,
    @Body('comment') comment: string,
    @Request() req,
  ) {
    return this.topicsService.review(id, req.user.id, decision, comment);
  }

  // GET /api/topics/:id/approvals — lịch sử duyệt của đề tài
  @Get('topics/:id/approvals')
  approvals(@Param('id') id: string) {
    return this.topicsService.getApprovals(id);
  }

  // ===== HỘI ĐỒNG (Cán bộ Phòng nhập kết quả) =====

  // PATCH /api/topics/:id/council/proposal — nhập kết quả Hội đồng đề cương
  @Patch('topics/:id/council/proposal')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DepartmentOfficer, UserRole.Admin)
  councilProposal(
    @Param('id') id: string,
    @Body() body: { decision: ApprovalDecision; note?: string; members?: any; scheduledAt?: string; location?: string },
    @Request() req,
  ) {
    return this.topicsService.recordProposalCouncil(id, body, req.user.id);
  }

  // PATCH /api/topics/:id/council/review — nhập kết quả Hội đồng phản biện / nghiệm thu
  @Patch('topics/:id/council/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DepartmentOfficer, UserRole.Admin)
  councilReview(
    @Param('id') id: string,
    @Body() body: { decision: ApprovalDecision; outcome?: ReviewOutcome; note?: string; members?: any; scheduledAt?: string; location?: string },
    @Request() req,
  ) {
    return this.topicsService.recordReviewCouncil(id, body, req.user.id);
  }

  // GET /api/topics/:id/councils — lịch sử hội đồng
  @Get('topics/:id/councils')
  councils(@Param('id') id: string) {
    return this.topicsService.getCouncils(id);
  }

  // ===== ĐỢT ĐỀ TÀI (FR-04→06) =====

  // GET /api/batches — danh sách đợt (GVHD chọn khi lập nhóm; Phòng quản lý)
  @Get('batches')
  listBatches() {
    return this.topicsService.getBatches();
  }

  // POST /api/batches — Cán bộ Phòng tạo đợt đề tài
  @Post('batches')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DepartmentOfficer, UserRole.Admin)
  createBatch(
    @Body() body: { name: string; year: string; description?: string; deadline: string },
    @Request() req,
  ) {
    return this.topicsService.createBatch(body, req.user.id);
  }

  // PATCH /api/batches/:id/toggle — đóng/mở đợt
  @Patch('batches/:id/toggle')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DepartmentOfficer, UserRole.Admin)
  toggleBatch(@Param('id') id: string, @Request() req) {
    return this.topicsService.toggleBatch(id, req.user.id);
  }

  // GET /api/report-stats — báo cáo thống kê (Khoa/Phòng/Trưởng Khoa/Admin)
  @Get('report-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.DepartmentOfficer, UserRole.FacultyDean, UserRole.Admin)
  reportStats() {
    return this.topicsService.getReportStats();
  }

  // ===== PHA 2: cấp GVHD =====
  // GET /api/lecturers-list — danh sách GVHD để cán bộ chọn
  @Get('lecturers-list')
  listLecturers() {
    return this.topicsService.listLecturers();
  }

  // PATCH /api/topics/:id/assign-supervisor — Cán bộ Khoa cấp GVHD
  @Patch('topics/:id/assign-supervisor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  assignSupervisor(@Param('id') id: string, @Body('lecturerId') lecturerId: string, @Request() req) {
    return this.topicsService.assignSupervisor(id, lecturerId, req.user.id);
  }

  // ===== PHA 4: báo cáo + hội đồng + điểm =====
  // PATCH /api/topics/:id/request-report — chủ nhiệm/GVHD xin báo cáo
  @Patch('topics/:id/request-report')
  requestReport(@Param('id') id: string, @Request() req) {
    return this.topicsService.requestReport(id, req.user.id);
  }

  // PATCH /api/topics/:id/review-report — Cán bộ Khoa/Phòng duyệt yêu cầu báo cáo
  @Patch('topics/:id/review-report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.DepartmentOfficer, UserRole.Admin)
  reviewReport(@Param('id') id: string, @Body('decision') decision: ApprovalDecision, @Request() req) {
    return this.topicsService.reviewReport(id, req.user.id, decision);
  }

  // PATCH /api/topics/:id/report-council — Cán bộ Khoa lập hội đồng báo cáo
  @Patch('topics/:id/report-council')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  reportCouncil(
    @Param('id') id: string,
    @Body() body: { lecturerIds: string[]; scheduledAt?: string; location?: string },
    @Request() req,
  ) {
    return this.topicsService.createReportCouncil(id, body, req.user.id);
  }

  // PATCH /api/topics/:id/score — Cán bộ Khoa nhập điểm + mở chỉnh sửa
  @Patch('topics/:id/score')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  enterScore(@Param('id') id: string, @Body() body: { score: number; editDeadline: string }, @Request() req) {
    return this.topicsService.enterScore(id, body, req.user.id);
  }

  // PATCH /api/topics/:id/cancel — Cán bộ Khoa huỷ đề tài
  @Patch('topics/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FacultyOfficer, UserRole.Admin)
  cancelTopic(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req) {
    return this.topicsService.cancelTopic(id, req.user.id, body?.reason);
  }
}
