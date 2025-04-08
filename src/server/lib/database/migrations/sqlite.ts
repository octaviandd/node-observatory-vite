/** @format */

export async function up(db: any): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // First check if table exists
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='observatory_entries'", (err: any, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          console.log("Table observatory_entries already exists");
          resolve();
          return;
        }

        // Create table if it doesn't exist
        db.run(`
          CREATE TABLE observatory_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid CHAR(36) NOT NULL UNIQUE,
            request_id CHAR(36) NULL,
            job_id CHAR(36) NULL,
            schedule_id CHAR(36) NULL,
            type VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
          );

          CREATE UNIQUE INDEX idx_uuid ON observatory_entries(uuid);
          CREATE INDEX idx_type ON observatory_entries(type);
          CREATE INDEX idx_created_at ON observatory_entries(created_at);
          CREATE INDEX idx_request_id ON observatory_entries(request_id);
          CREATE INDEX idx_job_id ON observatory_entries(job_id);
          CREATE INDEX idx_schedule_id ON observatory_entries(schedule_id);
        `, (err: any) => {
          if (err) reject(err);
          else {
            console.log("Table observatory_entries created successfully");
            resolve();
          }
        });
      });
    });
  });
}

export async function down(db: any): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run("DROP TABLE IF EXISTS observatory_entries;", (err: any) => {
      if (err) reject(err);
      else {
        console.log("Table observatory_entries dropped successfully");
        resolve();
      }
    });
  });
}  