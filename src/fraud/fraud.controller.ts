import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { FraudAlert } from 'src/fraud/fraud-alert.entity';
import { UserRole } from 'src/users/user.entity';
import { Repository } from 'typeorm';

@Controller('fraud')
export class FraudController {
  constructor(
    @InjectRepository(FraudAlert)
    private alertRepo: Repository<FraudAlert>,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('alerts')
  async getAlerts() {
    return this.alertRepo.find({
      relations: ['article'],
      order: { created_at: 'DESC' },
    });
  }
}
