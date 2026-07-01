import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  // GET /api/activities/topic/:topicId
  @Get('topic/:topicId')
  findByTopic(@Param('topicId') topicId: string) {
    return this.activitiesService.findByTopic(topicId);
  }

  // GET /api/activities/me
  @Get('me')
  findMine(@Request() req) {
    return this.activitiesService.findByUser(req.user.id);
  }

  // GET /api/activities?skip=0&take=20&order=desc&within24h=true  (Admin only)
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('order') order?: string,
    @Query('within24h') within24h?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.activitiesService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      order: order === 'asc' ? 'asc' : 'desc',
      within24h: within24h === 'true',
      from,
      to,
    });
  }
}
