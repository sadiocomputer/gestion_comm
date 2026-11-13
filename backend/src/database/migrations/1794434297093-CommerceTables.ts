import { MigrationInterface, QueryRunner } from "typeorm";

export class CommerceTables1794434297093 implements MigrationInterface {
    name = 'CommerceTables1794434297093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`sales\` (\`id\` int NOT NULL AUTO_INCREMENT, \`number\` varchar(30) NULL, \`client_id\` int NULL, \`user_id\` int NOT NULL, \`status\` varchar(20) NOT NULL, \`subtotal\` bigint NOT NULL, \`discount\` bigint NOT NULL, \`total\` bigint NOT NULL, \`notes\` varchar(255) NULL, \`cancelled_at\` datetime NULL, \`cancelled_by_id\` int NULL, \`cancel_reason\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_sales_number\` (\`number\`), INDEX \`IDX_sales_client\` (\`client_id\`), INDEX \`IDX_sales_user\` (\`user_id\`), INDEX \`IDX_sales_cancelled_by\` (\`cancelled_by_id\`), INDEX \`IDX_sales_created_at\` (\`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sale_items\` (\`id\` int NOT NULL AUTO_INCREMENT, \`sale_id\` int NOT NULL, \`product_id\` int NOT NULL, \`product_name\` varchar(150) NOT NULL, \`unit\` varchar(20) NOT NULL, \`quantity\` decimal(12,3) NOT NULL, \`unit_price\` bigint NOT NULL, \`unit_cost\` bigint NOT NULL, \`line_total\` bigint NOT NULL, INDEX \`IDX_sale_items_sale\` (\`sale_id\`), INDEX \`IDX_sale_items_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`stock_movements\` ADD \`sale_id\` int NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_stock_movements_sale\` ON \`stock_movements\` (\`sale_id\`)`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_sales_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_sales_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_sales_cancelled_by\` FOREIGN KEY (\`cancelled_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sale_items\` ADD CONSTRAINT \`FK_sale_items_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sale_items\` ADD CONSTRAINT \`FK_sale_items_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`sale_items\` DROP FOREIGN KEY \`FK_sale_items_product\``);
        await queryRunner.query(`ALTER TABLE \`sale_items\` DROP FOREIGN KEY \`FK_sale_items_sale\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_sales_cancelled_by\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_sales_user\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_sales_client\``);
        await queryRunner.query(`DROP INDEX \`IDX_stock_movements_sale\` ON \`stock_movements\``);
        await queryRunner.query(`ALTER TABLE \`stock_movements\` DROP COLUMN \`sale_id\``);
        await queryRunner.query(`DROP INDEX \`IDX_sale_items_product\` ON \`sale_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_sale_items_sale\` ON \`sale_items\``);
        await queryRunner.query(`DROP TABLE \`sale_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_sales_created_at\` ON \`sales\``);
        await queryRunner.query(`DROP INDEX \`IDX_sales_cancelled_by\` ON \`sales\``);
        await queryRunner.query(`DROP INDEX \`IDX_sales_user\` ON \`sales\``);
        await queryRunner.query(`DROP INDEX \`IDX_sales_client\` ON \`sales\``);
        await queryRunner.query(`DROP INDEX \`IDX_sales_number\` ON \`sales\``);
        await queryRunner.query(`DROP TABLE \`sales\``);
    }

}
