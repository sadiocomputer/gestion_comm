import { MigrationInterface, QueryRunner } from "typeorm";

export class Units1794443428130 implements MigrationInterface {
    name = 'Units1794443428130'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`units\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(20) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_units_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_units_name\` ON \`units\``);
        await queryRunner.query(`DROP TABLE \`units\``);
    }

}
