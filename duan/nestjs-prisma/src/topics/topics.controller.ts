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
import { TopicStatus, UserRole } from '@prisma/client';

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
    return this.topicsService.findMyTopics(req.user.id);
  }

  // GET /api/topics/:id
  @Get('topics/:id')
  findOne(@Param('id') id: string) {
    return this.topicsService.findOne(id);
  }

  // ===== STATE MACHINE (Admin) — đặt TRƯỚC topics/:id để không bị nuốt route =====

  // PATCH /api/topics/proceed  body: { ids: string[] }
  @Patch('topics/proceed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  proceed(@Body('ids') ids: string[], @Request() req) {
    return this.topicsService.proceed(ids, req.user.id);
  }

  // PATCH /api/topics/undo  body: { ids: string[] }
  @Patch('topics/undo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  undo(@Body('ids') ids: string[], @Request() req) {
    return this.topicsService.undo(ids, req.user.id);
  }

  // PATCH /api/topics/start-editing  body: { ids: string[], editDeadline: string }
  @Patch('topics/start-editing')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
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
  @Roles(UserRole.Admin)
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

  // DELETE /api/topics/:id (Admin only)
  @Delete('topics/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
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
}
