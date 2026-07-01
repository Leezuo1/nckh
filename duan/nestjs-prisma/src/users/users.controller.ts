import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

// ===== USER tự sửa profile của mình — KHÔNG cần Admin role =====
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  // PATCH /api/profile/me
  @Patch('me')
  updateMyProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin) // Toàn bộ users API chỉ Admin dùng được
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users?role=Student
  @Get()
  findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  // GET /api/users/students
  @Get('students')
  findStudents() {
    return this.usersService.findStudents();
  }

  // GET /api/users/lecturers
  @Get('lecturers')
  findLecturers() {
    return this.usersService.findLecturers();
  }

  // GET /api/users/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // POST /api/users
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // PATCH /api/users/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // PATCH /api/users/:id/password — Admin đặt/reset mật khẩu
  @Patch(':id/password')
  setPassword(@Param('id') id: string, @Body('password') password: string) {
    return this.usersService.setPassword(id, password);
  }

  // DELETE /api/users/:id (soft delete)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
