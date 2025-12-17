import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  getAllUsers() {
    return this.usersService.findAllUsersWithStats();
  }

  @Get('me')
  getMyProfile(@CurrentUser() user: JwtUser) {
    return this.usersService.getUserById(user.sub);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch('me')
  updateMyProfile(@Body() body: UpdateUserDto, @CurrentUser() user: JwtUser) {
    return this.usersService.updateUser(user.sub, user, body);
  }

  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deleteUser(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.usersService.deleteUser(id, user);
  }
}
