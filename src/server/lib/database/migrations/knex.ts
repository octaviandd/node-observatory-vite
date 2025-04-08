export async function up(knex: any): Promise<void> {
  // Check if table exists first
  const exists = await knex.schema.hasTable('observatory_entries');
  
  if (!exists) {
    return knex.schema.createTable('observatory_entries', (table: any) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.uuid('request_id').nullable();
      table.uuid('job_id').nullable();
      table.uuid('schedule_id').nullable();
      table.string('type', 20).notNullable();
      table.json('content').notNullable();
      table.timestamp('created_at', { precision: 3 }).notNullable();

      // Indexes
      table.index('uuid');
      table.index('type');
      table.index('created_at');
      table.index('request_id');
      table.index('job_id');
      table.index('schedule_id');
    });
  }
}

export async function down(knex: any): Promise<void> {
  return knex.schema.dropTableIfExists('observatory_entries');
}
