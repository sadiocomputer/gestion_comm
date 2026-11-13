import { MigrationInterface, QueryRunner } from "typeorm";

export class Expenses1794445759876 implements MigrationInterface {
    name = 'Expenses1794445759876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`expense_categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(60) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_expense_categories_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`expenses\` (\`id\` int NOT NULL AUTO_INCREMENT, \`category_id\` int NOT NULL, \`amount\` bigint NOT NULL, \`description\` varchar(255) NOT NULL, \`expense_date\` date NOT NULL, \`method\` varchar(20) NOT NULL, \`reference\` varchar(100) NULL, \`user_id\` int NOT NULL, \`status\` varchar(20) NOT NULL, \`cancelled_at\` datetime NULL, \`cancelled_by_id\` int NULL, \`cancel_reason\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_expenses_category\` (\`category_id\`), INDEX \`IDX_expenses_user\` (\`user_id\`), INDEX \`IDX_expenses_cancelled_by\` (\`cancelled_by_id\`), INDEX \`IDX_expenses_date\` (\`expense_date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`expenses\` ADD CONSTRAINT \`FK_expenses_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`expense_categories\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`expenses\` ADD CONSTRAINT \`FK_expenses_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`expenses\` ADD CONSTRAINT \`FK_expenses_cancelled_by\` FOREIGN KEY (\`cancelled_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`expenses\` DROP FOREIGN KEY \`FK_expenses_cancelled_by\``);
        await queryRunner.query(`ALTER TABLE \`expenses\` DROP FOREIGN KEY \`FK_expenses_user\``);
        await queryRunner.query(`ALTER TABLE \`expenses\` DROP FOREIGN KEY \`FK_expenses_category\``);
        await queryRunner.query(`DROP INDEX \`IDX_expenses_date\` ON \`expenses\``);
        await queryRunner.query(`DROP INDEX \`IDX_expenses_cancelled_by\` ON \`expenses\``);
        await queryRunner.query(`DROP INDEX \`IDX_expenses_user\` ON \`expenses\``);
        await queryRunner.query(`DROP INDEX \`IDX_expenses_category\` ON \`expenses\``);
        await queryRunner.query(`DROP TABLE \`expenses\``);
        await queryRunner.query(`DROP INDEX \`IDX_expense_categories_name\` ON \`expense_categories\``);
        await queryRunner.query(`DROP TABLE \`expense_categories\``);
    }

}
