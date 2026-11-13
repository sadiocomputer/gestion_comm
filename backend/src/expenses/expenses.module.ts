import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseCategory } from './entities/expense-category.entity';
import { Expense } from './entities/expense.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpenseCategory])],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  // Tableau de bord (totaux) et seed (catégories par défaut).
  exports: [ExpensesService],
})
export class ExpensesModule {}
