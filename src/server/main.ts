import { setupLogger } from "./lib/logger";
import express from "express";
import ViteExpress from "vite-express";
import cors from "cors";
import mysql2 from "mysql2/promise";
import { createClient } from "redis";

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(ViteExpress.static());

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

async function startServer() {
  let mysql2Connection = await mysql2.createConnection({
    host: "localhost",
    user: "root",
    database: "observatory",
    timezone: "UTC"
  });

  let redisConnection = createClient({
    url: "redis://localhost:6379",
  });

  await redisConnection.connect();

  const router = await setupLogger("mysql2", mysql2Connection, redisConnection);
  app.use("/observatory-api/data", router);

  ViteExpress.bind(app, server);
}

startServer().catch((error) => {
  console.error("Error starting the server:", error);
  process.exit(1);
});




