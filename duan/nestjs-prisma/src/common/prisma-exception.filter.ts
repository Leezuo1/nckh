import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Bắt các lỗi Prisma "lọt" ra ngoài (không được service tự xử lý) và đổi
 * thành response HTTP sạch sẽ thay vì 500 kèm stack trace khó hiểu.
 *
 * Đây là "luồng sai" dùng chung cho toàn hệ thống:
 *   - ID sai định dạng ObjectId (P2023)      → 400
 *   - Vi phạm ràng buộc unique (P2002)        → 409
 *   - Không tìm thấy record để update/delete  → 404 (P2025)
 *   - Body sai kiểu khiến query Prisma lỗi    → 400 (ValidationError)
 *
 * Shape trả về khớp với HttpException mặc định của Nest
 * ({ statusCode, message, error }) để interceptor axios ở frontend
 * (đọc error.response.data.message) hoạt động như cũ.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'Dữ liệu gửi lên không hợp lệ';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          // Unique constraint failed
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[] | string) ?? '';
          const fields = Array.isArray(target) ? target.join(', ') : target;
          message = fields
            ? `Giá trị đã tồn tại (trùng: ${fields})`
            : 'Dữ liệu đã tồn tại trong hệ thống';
          break;
        }
        case 'P2025': {
          // An operation failed because it depends on records that were not found
          status = HttpStatus.NOT_FOUND;
          message = 'Không tìm thấy dữ liệu';
          break;
        }
        case 'P2023':
        case 'P2003': {
          // Malformed ObjectID / invalid relation id
          status = HttpStatus.BAD_REQUEST;
          message = 'Mã định danh không hợp lệ';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          message = 'Yêu cầu không hợp lệ';
        }
      }
    } else {
      // PrismaClientValidationError — thường do thiếu field bắt buộc / sai kiểu
      status = HttpStatus.BAD_REQUEST;
      message = 'Dữ liệu gửi lên không hợp lệ';
    }

    // Log lại lỗi gốc để debug (không lộ ra cho client)
    const code =
      exception instanceof Prisma.PrismaClientKnownRequestError
        ? exception.code
        : 'ValidationError';
    this.logger.warn(`${code}: ${exception.message.split('\n').pop()}`);

    res.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }
}
