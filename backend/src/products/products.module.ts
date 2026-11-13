import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StocksModule } from '../stocks/stocks.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { Unit } from './entities/unit.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Unit]), StocksModule],
  controllers: [ProductsController, CategoriesController, UnitsController],
  providers: [ProductsService, CategoriesService, UnitsService],
  // UnitsService : utilisé par le seed.
  exports: [ProductsService, UnitsService],
})
export class ProductsModule {}
