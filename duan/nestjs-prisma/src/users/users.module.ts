import { Module } from '@nestjs/common';
import { UsersController, ProfileController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, ProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
