import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from 'src/articles/article.entity';
import { PriceHistory } from 'src/articles/price-history.entity';
import { FraudAlert } from './fraud-alert.entity';
import { FraudController } from './fraud.controller';
import { FraudGateway } from './fraud.gateway';
import { FraudService } from './fraud.service';

@Module({
  imports: [TypeOrmModule.forFeature([FraudAlert, Article, PriceHistory])],
  providers: [FraudService, FraudGateway],
  controllers: [FraudController],
  exports: [FraudService],
})
export class FraudModule {}
