/** @format */

export async function up(connection: any): Promise<void> {
  if (connection instanceof Promise) {
    connection = await connection;
  }

  const [rows] = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE()
    AND table_name = 'observatory_entries'
  `);

  if (rows[0].count === 0) {
    await connection.execute(`
      CREATE TABLE observatory_entries (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        request_id CHAR(36) NULL,
        job_id CHAR(36) NULL,
        schedule_id CHAR(36) NULL,
        type VARCHAR(20) NOT NULL,
        content JSON NOT NULL,
        created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

        INDEX idx_uuid (uuid),
        INDEX idx_request_id (request_id),
        INDEX idx_job_id (job_id),
        INDEX idx_schedule_id (schedule_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      );
    `);
    console.log("observatory_entries table created via mysql2 migration");
  }

}

export async function down(connection: any): Promise<void> {
  if (connection instanceof Promise) {
    connection = await connection;
  }

  await connection.execute("DROP TABLE IF EXISTS observatory_entries;");
}
