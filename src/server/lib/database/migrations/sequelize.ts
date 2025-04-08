/** @format */

import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export async function up(): Promise<void> {
  // First create the model file
  const modelPath = join(process.cwd(), 'src/models/ObservatoryEntry.ts');

  if (!existsSync(modelPath)) {
    const modelContent = `
import { Model, DataTypes, Sequelize } from 'sequelize';

export class ObservatoryEntry extends Model {
  declare id: number;
  declare uuid: string;
  declare request_id: string | null;
  declare job_id: string | null;
  declare schedule_id: string | null;
  declare type: string;
  declare content: any;
  declare created_at: Date;

  static initialize(sequelize: Sequelize) {
    this.init({
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      uuid: {
        type: DataTypes.CHAR(36),
        unique: true,
        allowNull: false
      },
      request_id: {
        type: DataTypes.CHAR(36),
        allowNull: true
      },
      job_id: {
        type: DataTypes.CHAR(36),
        allowNull: true
      },
      schedule_id: {
        type: DataTypes.CHAR(36),
        allowNull: true
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      content: {
        type: DataTypes.JSON,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE(3),
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      tableName: 'observatory_entries',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['uuid'], name: 'idx_uuid' },
        { fields: ['type'], name: 'idx_type' },
        { fields: ['created_at'], name: 'idx_created_at' },
        { fields: ['request_id'], name: 'idx_request_id' },
        { fields: ['job_id'], name: 'idx_job_id' },
        { fields: ['schedule_id'], name: 'idx_schedule_id' }
      ]
    });
  }
}`;

    // Create models directory if it doesn't exist
    const modelsDir = join(process.cwd(), 'src/models');
    if (!existsSync(modelsDir)) {
      mkdirSync(modelsDir, { recursive: true });
    }

    writeFileSync(modelPath, modelContent);
  }
}

export async function down(): Promise<void> {
  const modelPath = join(process.cwd(), 'src/models/ObservatoryEntry.ts');
  const migrationPath = join(process.cwd(), 'src/migrations/observatory-entries.ts');

  if (existsSync(modelPath)) {
    const model = readFileSync(modelPath, 'utf-8');
    const updatedModel = model.replace(/class ObservatoryEntry[\s\S]*?}\n/m, '');
    writeFileSync(modelPath, updatedModel);
  }

  if (existsSync(migrationPath)) {
    const migration = readFileSync(migrationPath, 'utf-8');
    const updatedMigration = migration.replace(/module.exports[\s\S]*?};\n/m, '');
    writeFileSync(migrationPath, updatedMigration);
  }
}
