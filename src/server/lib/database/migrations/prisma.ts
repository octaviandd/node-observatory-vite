/** @format */

import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export async function up(): Promise<void> {
  const schemaPath = join(process.cwd(), 'prisma/schema.prisma');
  
  if (!existsSync(schemaPath)) {
    console.log("Schema not found");
    throw new Error('Prisma schema not found. Make sure you have a schema.prisma file in your prisma directory.');
  }

  const schema = readFileSync(schemaPath, 'utf-8');
  
  // Check if model already exists
  if (schema.includes('model ObservatoryEntry')) {
    console.log("Model already exists");
    return;
  }

  // Observatory model definition
  const observatoryModel = `
model ObservatoryEntry {
  id          BigInt    @id @default(autoincrement())
  uuid        String    @unique @db.Char(36)
  request_id   String?   @map("request_id") @db.Char(36)
  job_id       String?   @map("job_id") @db.Char(36)
  schedule_id  String?   @map("schedule_id") @db.Char(36)
  type        String    @db.VarChar(20)
  content     Json
  created_at   DateTime  @default(now()) @map("created_at")

  @@map("observatory_entries")
  @@index([requestId], name: "idx_request_id")
  @@index([job_id], name: "idx_job_id")
  @@index([schedule_id], name: "idx_schedule_id")
  @@index([type], name: "idx_type") 
  @@index([created_at], name: "idx_created_at")
}`;

  // Append model to schema
  const updatedSchema = `${schema}\n${observatoryModel}\n`;
  writeFileSync(schemaPath, updatedSchema);
  console.log("Model added to schema");
}

export async function down(): Promise<void> {
  // Optionally remove the model from schema
  const schemaPath = join(process.cwd(), 'prisma/schema.prisma');
  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf-8');
    const updatedSchema = schema.replace(/model ObservatoryEntry {[\s\S]*?}\n/m, '');
    writeFileSync(schemaPath, updatedSchema);
  }
}  