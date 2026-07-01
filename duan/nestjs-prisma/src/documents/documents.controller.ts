import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, Request, UseInterceptors, UploadedFile, Res,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // POST /api/documents/upload
  // multipart/form-data: file + topicId + note
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('topicId') topicId: string,
    @Body('note') note: string,
    @Request() req,
  ) {
    // multer không gắn file nếu thiếu field "file", sai field name, hoặc vượt 20MB
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file hợp lệ để tải lên (tối đa 20MB)');
    }
    if (!topicId) {
      throw new BadRequestException('Thiếu mã đề tài (topicId)');
    }
    const format = this.documentsService.detectFormat(file.originalname);
    return this.documentsService.create({
      topicId,
      uploaderId: req.user.id,
      fileName: file.originalname,
      storedName: file.filename, // tên file random do multer tạo trên disk
      size: file.size,
      format,
      note,
    });
  }

  // GET /api/documents/:id/download — tải file về
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.findOne(id);
    if (!doc.storedName) {
      throw new NotFoundException('File không tồn tại trên server (upload trước khi có tính năng tải)');
    }
    const filePath = join(UPLOAD_DIR, doc.storedName);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File đã bị xóa khỏi server');
    }
    return res.download(filePath, doc.fileName);
  }

  // GET /api/documents/topic/:topicId 
  @Get('topic/:topicId')
  findByTopic(@Param('topicId') topicId: string) {
    return this.documentsService.findByTopic(topicId);
  }

  // DELETE /api/documents/:id 
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user);
  }
}
