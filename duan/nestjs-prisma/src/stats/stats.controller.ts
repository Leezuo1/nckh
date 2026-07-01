import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

// PUBLIC — không có JwtAuthGuard
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // GET /api/stats/public
  @Get('public')
  getPublicStats() {
    return this.statsService.getPublicStats();
  }
}
