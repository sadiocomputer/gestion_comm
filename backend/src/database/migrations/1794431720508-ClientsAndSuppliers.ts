import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientsAndSuppliers1794431720508 implements MigrationInterface {
    name = 'ClientsAndSuppliers1794431720508'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`suppliers\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(120) NOT NULL, \`contact_name\` varchar(120) NULL, \`phone\` varchar(20) NULL, \`address\` varchar(255) NULL, \`notes\` varchar(500) NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_suppliers_name\` (\`name\`), INDEX \`IDX_suppliers_phone\` (\`phone\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_suppliers_phone\` ON \`suppliers\``);
        await queryRunner.query(`DROP INDEX \`IDX_suppliers_name\` ON \`suppliers\``);
        await queryRunner.query(`DROP TABLE \`suppliers\``);
    }

}
