import { MigrationInterface, QueryRunner } from "typeorm";

export class Payments1794435070723 implements MigrationInterface {
    name = 'Payments1794435070723'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`client_payments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`sale_id\` int NOT NULL, \`client_id\` int NULL, \`amount\` bigint NOT NULL, \`method\` varchar(20) NOT NULL, \`reference\` varchar(100) NULL, \`notes\` varchar(255) NULL, \`user_id\` int NOT NULL, \`status\` varchar(20) NOT NULL, \`cancelled_at\` datetime NULL, \`cancelled_by_id\` int NULL, \`cancel_reason\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_client_payments_sale\` (\`sale_id\`), INDEX \`IDX_client_payments_client\` (\`client_id\`), INDEX \`IDX_client_payments_user\` (\`user_id\`), INDEX \`IDX_client_payments_cancelled_by\` (\`cancelled_by_id\`), INDEX \`IDX_client_payments_created_at\` (\`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`supplier_payments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`supplier_id\` int NOT NULL, \`amount\` bigint NOT NULL, \`method\` varchar(20) NOT NULL, \`reference\` varchar(100) NULL, \`notes\` varchar(255) NULL, \`user_id\` int NOT NULL, \`status\` varchar(20) NOT NULL, \`cancelled_at\` datetime NULL, \`cancelled_by_id\` int NULL, \`cancel_reason\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_supplier_payments_supplier\` (\`supplier_id\`), INDEX \`IDX_supplier_payments_user\` (\`user_id\`), INDEX \`IDX_supplier_payments_cancelled_by\` (\`cancelled_by_id\`), INDEX \`IDX_supplier_payments_created_at\` (\`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD \`amount_paid\` bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`client_payments\` ADD CONSTRAINT \`FK_client_payments_sale\` FOREIGN KEY (\`sale_id\`) REFERENCES \`sales\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`client_payments\` ADD CONSTRAINT \`FK_client_payments_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`client_payments\` ADD CONSTRAINT \`FK_client_payments_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`client_payments\` ADD CONSTRAINT \`FK_client_payments_cancelled_by\` FOREIGN KEY (\`cancelled_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`supplier_payments\` ADD CONSTRAINT \`FK_supplier_payments_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`supplier_payments\` ADD CONSTRAINT \`FK_supplier_payments_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`supplier_payments\` ADD CONSTRAINT \`FK_supplier_payments_cancelled_by\` FOREIGN KEY (\`cancelled_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`supplier_payments\` DROP FOREIGN KEY \`FK_supplier_payments_cancelled_by\``);
        await queryRunner.query(`ALTER TABLE \`supplier_payments\` DROP FOREIGN KEY \`FK_supplier_payments_user\``);
        await queryRunner.query(`ALTER TABLE \`supplier_payments\` DROP FOREIGN KEY \`FK_supplier_payments_supplier\``);
        await queryRunner.query(`ALTER TABLE \`client_payments\` DROP FOREIGN KEY \`FK_client_payments_cancelled_by\``);
        await queryRunner.query(`ALTER TABLE \`client_payments\` DROP FOREIGN KEY \`FK_client_payments_user\``);
        await queryRunner.query(`ALTER TABLE \`client_payments\` DROP FOREIGN KEY \`FK_client_payments_client\``);
        await queryRunner.query(`ALTER TABLE \`client_payments\` DROP FOREIGN KEY \`FK_client_payments_sale\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP COLUMN \`amount_paid\``);
        await queryRunner.query(`DROP INDEX \`IDX_supplier_payments_created_at\` ON \`supplier_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_supplier_payments_cancelled_by\` ON \`supplier_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_supplier_payments_user\` ON \`supplier_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_supplier_payments_supplier\` ON \`supplier_payments\``);
        await queryRunner.query(`DROP TABLE \`supplier_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_client_payments_created_at\` ON \`client_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_client_payments_cancelled_by\` ON \`client_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_client_payments_user\` ON \`client_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_client_payments_client\` ON \`client_payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_client_payments_sale\` ON \`client_payments\``);
        await queryRunner.query(`DROP TABLE \`client_payments\``);
    }

}
