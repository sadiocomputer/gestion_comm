import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement])],
  controllers: [StocksController],
  providers: [StocksService],
  // Utilisé par Produits (stock initial) et Ventes (phase 8).
  exports: [StocksService],
})
export class StocksModule {}
