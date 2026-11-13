import { MigrationInterface, QueryRunner } from "typeorm";

export class CommerceTables1794433086959 implements MigrationInterface {
    name = 'CommerceTables1794433086959'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(80) NOT NULL, \`description\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_categories_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`products\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(150) NOT NULL, \`sku\` varchar(50) NULL, \`category_id\` int NULL, \`unit\` varchar(20) NOT NULL, \`purchase_price\` bigint NOT NULL, \`sale_price\` bigint NOT NULL, \`quantity\` decimal(12,3) NOT NULL, \`min_stock\` decimal(12,3) NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_products_name\` (\`name\`), UNIQUE INDEX \`IDX_products_sku\` (\`sku\`), INDEX \`IDX_products_category\` (\`category_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`stock_movements\` (\`id\` int NOT NULL AUTO_INCREMENT, \`product_id\` int NOT NULL, \`type\` varchar(20) NOT NULL, \`quantity_change\` decimal(12,3) NOT NULL, \`quantity_before\` decimal(12,3) NOT NULL, \`quantity_after\` decimal(12,3) NOT NULL, \`unit_cost\` bigint NULL, \`supplier_id\` int NULL, \`reason\` varchar(255) NULL, \`user_id\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_stock_movements_supplier\` (\`supplier_id\`), INDEX \`IDX_stock_movements_user\` (\`user_id\`), INDEX \`IDX_stock_movements_product_date\` (\`product_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_products_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`stock_movements\` ADD CONSTRAINT \`FK_stock_movements_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`stock_movements\` ADD CONSTRAINT \`FK_stock_movements_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`stock_movements\` ADD CONSTRAINT \`FK_stock_movements_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`stock_movements\` DROP FOREIGN KEY \`FK_stock_movements_user\``);
        await queryRunner.query(`ALTER TABLE \`stock_movements\` DROP FOREIGN KEY \`FK_stock_movements_supplier\``);
        await queryRunner.query(`ALTER TABLE \`stock_movements\` DROP FOREIGN KEY \`FK_stock_movements_product\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_products_category\``);
        await queryRunner.query(`DROP INDEX \`IDX_stock_movements_product_date\` ON \`stock_movements\``);
        await queryRunner.query(`DROP INDEX \`IDX_stock_movements_user\` ON \`stock_movements\``);
        await queryRunner.query(`DROP INDEX \`IDX_stock_movements_supplier\` ON \`stock_movements\``);
        await queryRunner.query(`DROP TABLE \`stock_movements\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_category\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_sku\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_name\` ON \`products\``);
        await queryRunner.query(`DROP TABLE \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_categories_name\` ON \`categories\``);
        await queryRunner.query(`DROP TABLE \`categories\``);
    }

}
