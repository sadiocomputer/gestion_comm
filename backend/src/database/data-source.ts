import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Client } from '../clients/entities/client.entity';
import { ExpenseCategory } from '../expenses/entities/expense-category.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Permission } from '../roles/entities/permission.entity';
import { ClientPayment } from '../payments/entities/client-payment.entity';
import { SupplierPayment } from '../payments/entities/supplier-payment.entity';
import { Category } from '../products/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Unit } from '../products/entities/unit.entity';
import { Role } from '../roles/entities/role.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Sale } from '../sales/entities/sale.entity';
import { StockMovement } from '../stocks/entities/stock-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';

config({ quiet: true });

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: 'Z',
  entities: [
    User,
    RefreshToken,
    Role,
    Permission,
    Client,
    Supplier,
    Category,
    Product,
    Unit,
    StockMovement,
    Sale,
    SaleItem,
    ClientPayment,
    SupplierPayment,
    ExpenseCategory,
    Expense,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
