import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { TimelinesService } from './timelines.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('timelines')
@UseGuards(JwtAuthGuard)
export class TimelinesController {
  constructor(private readonly timelinesService: TimelinesService) {}

  // GET /api/timelines/topic/:topicId
  @Get('topic/:topicId')
  findByTopic(@Param('topicId') topicId: string) {
    return this.timelinesService.findByTopic(topicId);
  }

  // POST /api/timelines
  @Post()
  create(
    @Body() body: { topicId: string; timelineName: string; deadline: string },
    @Request() req,
  ) {
    return this.timelinesService.create(body, req.user);
  }

  // PATCH /api/timelines/:id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { timelineName?: string; deadline?: string },
    @Request() req,
  ) {
    return this.timelinesService.update(id, body, req.user);
  }

  // PATCH /api/timelines/:id/toggle
  @Patch(':id/toggle')
  toggleComplete(@Param('id') id: string, @Request() req) {
    return this.timelinesService.toggleComplete(id, req.user);
  }

  // DELETE /api/timelines/:id
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.timelinesService.remove(id, req.user);
  }
}
