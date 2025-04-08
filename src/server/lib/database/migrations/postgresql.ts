/** @format */
export async function up(client: any): Promise<void> {
  if(client instanceof Promise) {
    client = await client;
  }

  // First check if table exists
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'observatory_entries'
    );
  `);

  if (!tableExists.rows[0].exists) {
    await client.query(`
      CREATE TABLE observatory_entries (
        id BIGSERIAL PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        request_id CHAR(36) NULL,
        job_id CHAR(36) NULL,
        schedule_id CHAR(36) NULL,
        type VARCHAR(20) NOT NULL,
        content JSONB NOT NULL,
        created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT idx_uuid UNIQUE (uuid)
      );
      
      CREATE INDEX idx_type ON observatory_entries(type);
      CREATE INDEX idx_created_at ON observatory_entries(created_at);
      CREATE INDEX idx_request_id ON observatory_entries(request_id);
      CREATE INDEX idx_job_id ON observatory_entries(job_id);
      CREATE INDEX idx_schedule_id ON observatory_entries(schedule_id);
    `);
    console.log("PostgreSQL table created successfully");
  } else {
    console.log("PostgreSQL table already exists");
  }
}

export async function down(client: any): Promise<void> {
  if(client instanceof Promise) {
    client = await client;
  }
  await client.query("DROP TABLE IF EXISTS observatory_entries;");
  console.log("PostgreSQL table dropped successfully");
}
