/** @format */

import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export async function up(): Promise<void> {
  // First add the entity
  const entityPath = join(process.cwd(), 'src/entities/ObservatoryEntry.ts');
  
  if (!existsSync(entityPath)) {
    const entityContent = `
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm"

@Entity("observatory_entries")
export class ObservatoryEntry {
    @PrimaryGeneratedColumn({ type: "char", length: 36, unique: true })
    @Index("idx_uuid")
    uuid!: string;

    @Column({ type: "char", length: 36, nullable: true, name: "request_id" })
    @Index("idx_request_id")
    request_id!: string | null;

    @Column({ type: "char", length: 36, nullable: true, name: "job_id" })
    @Index("idx_job_id")
    job_id!: string | null;

    @Column({ type: "char", length: 36, nullable: true, name: "schedule_id" })
    @Index("idx_schedule_id")
    schedule_id!: string | null;

    @Column({ type: "varchar", length: 20 })
    @Index("idx_type")
    type!: string;

    @Column({ type: "json" })
    content!: any;

    @Column({ 
        type: "timestamp",
        precision: 3,
        default: () => "CURRENT_TIMESTAMP(3)",
        name: "created_at"
    })
    @Index("idx_created_at")
    created_at!: Date;
}`;

    // Create entities directory if it doesn't exist
    const entitiesDir = join(process.cwd(), 'src/entities');
    if (!existsSync(entitiesDir)) {
      mkdirSync(entitiesDir, { recursive: true });
    }

    writeFileSync(entityPath, entityContent);
    console.log("Entity file created successfully");
  }
}


