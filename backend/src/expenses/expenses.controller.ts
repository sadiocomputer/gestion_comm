import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { User } from '../users/entities/user.entity';
import {
  CancelExpenseDto,
  CreateExpenseDto,
  ExpenseCategoryDto,
  ListExpensesQueryDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // --- Dépenses ---------------------------------------------------------------

  @Get('expenses')
  @RequirePermissions('expenses.read')
  list(@Query() query: ListExpensesQueryDto) {
    return this.expensesService.list(query);
  }

  @Post('expenses')
  @RequirePermissions('expenses.create')
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: User) {
    return this.expensesService.create(dto, user.id);
  }

  @Post('expenses/:id/cancel')
  @RequirePermissions('expenses.cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelExpenseDto,
    @CurrentUser() user: User,
  ) {
    return this.expensesService.cancel(id, dto.reason, user.id);
  }

  // --- Catégories de dépenses --------------------------------------------------

  @Get('expense-categories')
  @RequirePermissions('expenses.read')
  listCategories() {
    return this.expensesService.listCategories();
  }

  @Post('expense-categories')
  @RequirePermissions('expenses.create')
  createCategory(@Body() dto: ExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @Patch('expense-categories/:id')
  @RequirePermissions('expenses.create')
  renameCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: ExpenseCategoryDto) {
    return this.expensesService.renameCategory(id, dto);
  }

  @Delete('expense-categories/:id')
  @HttpCode(204)
  @RequirePermissions('expenses.create')
  async removeCategory(@Param('id', ParseIntPipe) id: number) {
    await this.expensesService.removeCategory(id);
  }
}
