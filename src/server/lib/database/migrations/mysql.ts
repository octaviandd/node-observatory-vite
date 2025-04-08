/** @format */

export async function up(connection: any): Promise<void> {
  // Ensure the connection is established
  if (connection instanceof Promise) {
    connection = await connection;
  }

  console.log("Connection established: ", connection);
 
  // Create observatory_entries table
  connection.query(`
    CREATE TABLE observatory_entries (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(36) NOT NULL UNIQUE,
      request_id CHAR(36) NULL,
      job_id CHAR(36) NULL,
      schedule_id CHAR(36) NULL,
      type VARCHAR(20) NOT NULL,
      content JSON NOT NULL,
      created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
      
      INDEX idx_uuid (uuid),
      INDEX idx_request_id (request_id),
      INDEX idx_job_id (job_id),
      INDEX idx_schedule_id (schedule_id),
      INDEX idx_type (type),
      INDEX idx_created_at (created_at)
    );
  `);
}

export async function down(connection: any): Promise<void> {
  // Ensure the connection is established
  if (connection instanceof Promise) {
    connection = await connection;
  }
  
  await connection.execute("DROP TABLE IF EXISTS observatory_entries;");
}
