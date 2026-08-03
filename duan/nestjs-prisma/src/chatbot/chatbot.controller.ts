import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // POST /api/chatbot/ask  body: { message: string }
  @Post('ask')
  ask(@Body('message') message: string, @Request() req) {
    return this.chatbotService.ask(req.user.id, message);
  }
}
