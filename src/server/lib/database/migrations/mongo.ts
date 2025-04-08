/** @format */

export async function up(client: any): Promise<void> {
  const db = client.db("observatory");

  const collections = await db.listCollections({ name: "observatory_entries" }).toArray();
  if (collections.length > 0) {
    console.log("observatory_entries collection already exists");
    return;
  }

  // Create observatory_entries collection
  await db.createCollection("observatory_entries", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["uuid", "type", "content", "created_at"],
        properties: {
          uuid: { bsonType: "string" },
          request_id: { bsonType: "string" },
          job_id: { bsonType: "string" },
          schedule_id: { bsonType: "string" },
          type: { bsonType: "string" },
          content: { bsonType: "object" },
          created_at: { bsonType: "date" }
        }
      }
    }
  });

  // Create indexes
  await db.collection("observatory_entries").createIndexes([
    { key: { uuid: 1 }, unique: true },
    { key: { request_id: 1 } },
    { key: { job_id: 1 } },
    { key: { schedule_id: 1 } },
    { key: { type: 1 } },
    { key: { created_at: 1 } }
  ]);

  console.log("MongoDB migration completed.");
}

export async function down(client: any): Promise<void> {
  const db = client.db("observatory");
  await db.collection("observatory_entries").drop();
  console.log("MongoDB migration completed.");
}
