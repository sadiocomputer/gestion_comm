import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateClients1794431184596 implements MigrationInterface {
    name = 'CreateClients1794431184596'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clients\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(120) NOT NULL, \`phone\` varchar(20) NULL, \`address\` varchar(255) NULL, \`notes\` varchar(500) NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_clients_name\` (\`name\`), INDEX \`IDX_clients_phone\` (\`phone\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_clients_phone\` ON \`clients\``);
        await queryRunner.query(`DROP INDEX \`IDX_clients_name\` ON \`clients\``);
        await queryRunner.query(`DROP TABLE \`clients\``);
    }

}
