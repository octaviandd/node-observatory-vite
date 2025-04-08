import { up as mysql2Up } from "./mysql2";
import { up as mysqlUp } from "./mysql";
import { up as postgresUp } from "./postgresql";
import { up as mongodbUp } from "./mongo";
import { up as prismaUp } from "./prisma";
import { up as sqliteUp } from "./sqlite";
import { up as typeormUp } from "./typeorm";
import { up as knexUp } from "./knex";
import { up as sequelizeUp } from "./sequelize";

export {
  mysql2Up,
  mysqlUp,
  postgresUp,
  mongodbUp,
  prismaUp,
  sqliteUp,
  typeormUp,
  knexUp,
  sequelizeUp
}