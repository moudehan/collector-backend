import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudAlert } from './fraud-alert.entity';
import { FraudService } from './fraud.service';
import { PriceHistory } from 'src/articles/price-history.entity';
import { Article } from 'src/articles/article.entity';
import { FraudController } from './fraud.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FraudAlert, PriceHistory, Article])],
  controllers: [FraudController],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
