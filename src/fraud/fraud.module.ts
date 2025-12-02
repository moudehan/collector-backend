import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/article.entity';
import { PriceHistory } from '../articles/price-history.entity';
import { FraudAlert } from './fraud-alert.entity';
import { FraudController } from './fraud.controller';
import { FraudGateway } from './fraud.gateway';
import { FraudService } from './fraud.service';

@Module({
  imports: [TypeOrmModule.forFeature([FraudAlert, PriceHistory, Article])],
  providers: [FraudService, FraudGateway],
  controllers: [FraudController],
  exports: [FraudService],
})
export class FraudModule {}
