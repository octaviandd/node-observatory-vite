

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface RequestFilters extends WatcherFilters {
  index: "instance" | "group";
  key?: string;
  status: "all" | "2xx" | "4xx" | "5xx";
};

class RequestWatcher extends BaseWatcher {
  readonly type = "request";

  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  /**
   * View Methods
   * --------------------------------------------------------------------------
   */
  protected async handleViewSQL(id: string): Promise<any> {
  const [results]: [any[], any] = await this.storeConnection.query(
    "SELECT * FROM observatory_entries WHERE uuid = ? OR request_id = (SELECT request_id FROM observatory_entries WHERE uuid = ?)",
    [id, id]
  );

  return this.groupItemsByType(results);
  }

  protected async handleViewKnex(id: string): Promise<any> {
    const results = await this.storeConnection("observatory_entries")
      .where("uuid", id)
      .orWhere("request_id", id);

    return this.groupItemsByType(results);
  }

  protected async handleViewMongodb(id: string): Promise<any> {
    const results = await this.storeConnection
      .db('observatory')
      .collection("observatory_entries")
      .find({
        $or: [{ uuid: id }, { request_id: id }]
      })
      .toArray();

    return this.groupItemsByType(results);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.findMany({
      where: {
        OR: [{ uuid: id }, { request_id: id }]
      }
    });

    return this.groupItemsByType(results);
  }

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.find({
      where: {
        OR: [{ uuid: id }, { request_id: id }]
      }
    });

    return this.groupItemsByType(results);
  }

  protected async handleViewSequelize(id: string): Promise<any> {
    const [results] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE uuid = ? OR request_id = ?",
      [id, id]
    );
    return this.groupItemsByType(results);
  }

  /**
   * Related Data Methods
   * --------------------------------------------------------------------------
   */
  protected async handleRelatedDataSQL(requestId: string): Promise<any> {
    const [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE request_id = ? AND type != 'request'",
      [requestId]
    );


    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataKnex(requestId: string): Promise<any> {
    const results = await this.storeConnection("observatory_entries")
      .where({ request_id: requestId })
      .whereNot({ type: "request" });

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataMongodb(requestId: string): Promise<any> {
    const results = await this.storeConnection
      .db('observatory')
      .collection("observatory_entries")
      .find({ request_id: requestId, type: { $ne: "request" } })
      .toArray();

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataPrisma(requestId: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.findMany({
      where: {
        request_id: requestId,
        type: { $ne: "request" }
      }
    });

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataTypeorm(requestId: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.find({
      where: {
        request_id: requestId,
        type: { $ne: "request" }
      }
    });

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataSequelize(requestId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: { request_id: requestId, type: { not: this.type } }
    });
    return this.groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceSQL(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routeSql = key ? this.getEqualitySQL(key, "route") : "";
    let querySql = query ? this.getInclusionSQL(query, "route") : "";
    let periodSql = period ? this.getPeriodSQL(period) : "";
    let statusSql = status ? this.getStatusSQL(status) : "";

    const [results] = (await this.storeConnection.query(
      `SELECT * FROM observatory_entries WHERE type = 'request' ${routeSql} ${querySql} ${periodSql} ${statusSql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    )) as [any[]];

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) AS total FROM observatory_entries WHERE type = 'request' ${routeSql} ${querySql} ${periodSql} ${statusSql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    ) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  };

  protected async getIndexTableDataByInstanceKnex(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routeSQL = (key ? this.getEqualitySQL(key, "route") : "").replace(/^AND/, "");
    let querySQL = (query ? this.getInclusionSQL(query, "route") : "").replace(/^AND/, "");
    let periodSQL = (period ? this.getPeriodSQL(period) : "").replace(/^AND/, "");
    let statusSQL = (status ? this.getStatusSQL(status) : "").replace(/^AND/, "");

    const knexQuery = this.storeConnection("observatory_entries")
      .where("type", "request")
      .whereRaw(routeSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(statusSQL || "1=1");

    const results = await knexQuery
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset); 

    return { results, count: results.length };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routeMongoFilter = key ? { key } : {};
    let queryMongoFilter = query ? { key: { $regex: query } } : {};
    let periodMongoFilter = period
      ? {
          created_at: {
            $gte: new Date(Date.now() - this.periods[period] * 60 * 1000),
          },
        }
      : {};
    let statusMongoFilter = status !== 'all'
      ? { statusCode: { $regex: `^${status[0]}` } }
      : {};

    const results = await this.storeConnection
      .db('observatory')
      .collection("observatory_entries")
      .find({
        type: 'request',
        ...routeMongoFilter,
        ...queryMongoFilter,
        ...periodMongoFilter,
        ...statusMongoFilter,
      })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { results: results, count: results.length };
  };

  protected async getIndexTableDataByInstancePrisma(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routePrismaFilter = key ? { key } : {};
    let queryPrismaFilter = query ? { key: { contains: query } } : {};
    let periodPrismaFilter = period ? { created_at: { gte: new Date(Date.now() - this.periods[period] * 60 * 1000) } } : {};
    let statusPrismaFilter = status ? { statusCode: { contains: status[0] } } : {};

    const results = await this.storeConnection.observatory_entries.findMany({
      where: {
        ...routePrismaFilter,
        ...queryPrismaFilter,
        ...periodPrismaFilter,
        ...statusPrismaFilter,
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
    });

    return { results: results, count: results.length };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routeTypeormFilter = key ? { key } : {};
    let queryTypeormFilter = query ? { key: { contains: query } } : {};
    let periodTypeormFilter = period ? { created_at: { gte: new Date(Date.now() - this.periods[period] * 60 * 1000) } } : {};
    let statusTypeormFilter = status ? { statusCode: { contains: status[0] } } : {};

    const results = await this.storeConnection.observatory_entries.find({
      where: {
        ...routeTypeormFilter,
        ...queryTypeormFilter,
        ...periodTypeormFilter,
        ...statusTypeormFilter,
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
    });

    return { results: results, count: results.length };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routeFilter = key ? { key } : {};
    let queryFilter = query ? { key: { contains: query } } : {};
    let periodFilter = period ? { created_at: { gte: new Date(Date.now() - this.periods[period] * 60 * 1000) } } : {};
    let statusFilter = status ? { statusCode: { contains: status[0] } } : {};

    const results = await this.storeConnection.observatoryEntry.findAll({
      where: {
        ...routeFilter,
        ...queryFilter,
        ...periodFilter,
        ...statusFilter,
      },
      order: [['created_at', 'DESC']],
      offset: offset,
      limit: limit
    });

    return { results: results, count: results.length };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(filters: RequestFilters): Promise<any> {
    const { period, key, query, offset, limit } = filters;
    let routeSQL = key ? this.getEqualitySQL(key, "route") : "";
    let timeSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "route") : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
      JSON_UNQUOTE(JSON_EXTRACT(content, '$.route')) as route,
      COUNT(*) as total,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500,
      CAST(
        SUBSTRING_INDEX(
          SUBSTRING_INDEX(
            GROUP_CONCAT(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
              ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
              SEPARATOR ','
            ),
            ',',
            CEILING(COUNT(*) * 0.95)
          ),
          ',',
          -1
        ) AS DECIMAL(10,2)
      ) AS p95,
      CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
      CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
      CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average
      FROM observatory_entries
      WHERE type = 'request' ${routeSQL} ${timeSQL} ${querySQL}
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.route'))
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}`
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.route'))) as total FROM observatory_entries WHERE type = 'request' ${routeSQL} ${timeSQL} ${querySQL} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  };

  protected async getIndexTableDataByGroupKnex(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routeSQL = (key ? this.getInclusionSQL(key, "route") : "").replace(/^AND/, "");
    let querySQL = (query ? this.getInclusionSQL(query, "route") : "").replace(/^AND/, "");
    let periodSQL = (period ? this.getPeriodSQL(period) : "").replace(/^AND/, "");
    let statusSQL = (status ? this.getStatusSQL(status) : "").replace(/^AND/, "");

    const results = await this.storeConnection("observatory_entries")
      .where("type", "request")
      .whereRaw(routeSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.route")) as route'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "2%" THEN 1 ELSE 0 END) as count_200'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "4%" THEN 1 ELSE 0 END) as count_400'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "5%" THEN 1 ELSE 0 END) as count_500'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw(`
          CAST(
            SUBSTRING_INDEX(
              SUBSTRING_INDEX(
                GROUP_CONCAT(
                  CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))
                  ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))
                  SEPARATOR ','
                ),
                ',',
                CEILING(COUNT(*) * 0.95)
              ),
              ',',
              -1
            ) AS DECIMAL(10,2)
          ) AS p95
        `)
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.route"))'))
      .orderBy('count', 'desc')
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "request")
      .whereRaw(routeSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.route"))'));

    return {
      results: results.map((row: any) => ({
        ...row,
        shortest: parseFloat(row.shortest).toFixed(2),
        longest: parseFloat(row.longest).toFixed(2),
        average: parseFloat(row.average).toFixed(2),
        p95: parseFloat(row.p95).toFixed(2)
      })),
      count: count[0]['count']
    };
  }

  protected async getIndexTableDataByGroupMongodb(filters: RequestFilters): Promise<any> {
    const { period, query, key, offset, limit } = filters;
    let routeMongoFilter = key ? { key } : {};
    let queryMongoFilter = query ? { key: { $regex: query } } : {};
    let periodMongoFilter = period
      ? {
          created_at: {
            $gte: new Date(Date.now() - this.periods[period] * 60 * 1000),
          },
        }
      : {};


    const results = await this.storeConnection
      .db('observatory')
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: 'request',
            ...routeMongoFilter,
            ...queryMongoFilter,
            ...periodMongoFilter,
          },
        },
        {
          $group: {
            _id: "$content.route",
            total: { $sum: 1 },
            count_200: {
              $sum: {
                $cond: [
                  { $and: [ { $gte: ["$content.statusCode", 200] }, { $lt: ["$content.statusCode", 300] } ] },
                  1,
                  0,
                ],
              },
            },
            count_400: {
              $sum: {
                $cond: [
                  { $and: [ { $gte: ["$content.statusCode", 400] }, { $lt: ["$content.statusCode", 500] } ] },
                  1,
                  0,
                ],
              },
            },
            count_500: {
              $sum: {
                $cond: [
                  { $and: [ { $gte: ["$content.statusCode", 500] }, { $lt: ["$content.statusCode", 600] } ] },
                  1,
                  0,
                ],
              },
            },
            shortest: { $min: { $toDouble: "$content.duration" } },
            longest: { $max: { $toDouble: "$content.duration" } },
            average: { $avg: { $toDouble: "$content.duration" } },
            durations: { $push: { $toDouble: "$content.duration" } }
          },
        },
        {
          $addFields: {
            p95: {
              $let: {
                vars: {
                  sortedDurations: { $sortArray: { input: "$durations", sortBy: 1 } },
                  index: {
                    $floor: {
                      $multiply: [
                        0.95,
                        { $subtract: [{ $size: "$durations" }, 1] }
                      ]
                    }
                  }
                },
                in: { $arrayElemAt: ["$$sortedDurations", "$$index"] }
              }
            }
          }
        },
        {
          $sort: { total: -1 },
        },
        {
          $skip: offset,
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

    return { results, count: results.length };
  };

  protected async getIndexTableDataByGroupPrisma(filters: RequestFilters): Promise<any> {
    const { period, query, key, offset, limit } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const routeFilter = key ? { key } : {};
    const queryFilter = query ? { key: { contains: query } } : {};

    const results = await this.storeConnection.$queryRaw`
      WITH stats AS (
        SELECT 
          JSON_EXTRACT(content, '$.route') as route,
          COUNT(*) as total,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '2%' THEN 1 ELSE 0 END) as count_200,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '4%' THEN 1 ELSE 0 END) as count_400,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '5%' THEN 1 ELSE 0 END) as count_500,
          MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as shortest,
          MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as longest,
          AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as average,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as p95
        FROM observatory_entries
        WHERE type = 'request'
        ${timeFilter.created_at ? `AND created_at >= ${timeFilter.created_at.gte}` : ''}
        ${routeFilter.key ? `AND JSON_EXTRACT(content, '$.route') = ${key}` : ''}
        ${queryFilter.key ? `AND JSON_EXTRACT(content, '$.route') LIKE ${`%${query}%`}` : ''}
        GROUP BY JSON_EXTRACT(content, '$.route')
        ORDER BY total DESC
        LIMIT ${limit}
        OFFSET ${offset}
      )
      SELECT * FROM stats
    `;

    return { results, count: results.length };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: RequestFilters): Promise<any> {
    const { period, query, key, offset, limit } = filters;
    const timeFilter = period ? `created_at >= '${new Date(Date.now() - this.periods[period] * 60 * 1000).toISOString()}'` : '1=1';
    const routeFilter = key ? `JSON_EXTRACT(content, '$.route') = '${key}'` : '1=1';
    const queryFilter = query ? `JSON_EXTRACT(content, '$.route') LIKE '%${query}%'` : '1=1';

    const results = await this.storeConnection.observatoryEntry
      .createQueryBuilder('entry')
      .select('JSON_EXTRACT(content, "$.route")', 'route')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "2%" THEN 1 ELSE 0 END)', 'count_200')
      .addSelect('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "4%" THEN 1 ELSE 0 END)', 'count_400')
      .addSelect('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "5%" THEN 1 ELSE 0 END)', 'count_500')
      .addSelect('MIN(CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2)))', 'shortest')
      .addSelect('MAX(CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2)))', 'longest')
      .addSelect('AVG(CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2)))', 'average')
      .addSelect(`
        CAST(
          SUBSTRING_INDEX(
            SUBSTRING_INDEX(
              GROUP_CONCAT(CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2)) ORDER BY CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2))),
              ',',
              CEILING(COUNT(*) * 0.95)
            ),
            ',',
            -1
          ) AS DECIMAL(10,2)
        )`, 'p95')
      .where('type = :type', { type: 'request' })
      .andWhere(timeFilter)
      .andWhere(routeFilter)
      .andWhere(queryFilter)
      .groupBy('JSON_EXTRACT(content, "$.route")')
      .orderBy('total', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    return { results, count: results.length };
  }

  protected async getIndexTableDataByGroupSequelize(filters: RequestFilters): Promise<any> {
    const { period, query, key, offset, limit } = filters;
    let periodSql = period ? `created_at >= '${new Date(Date.now() - this.periods[period] * 60 * 1000).toISOString()}'` : '1=1';
    let routeSql = key ? `route = '${key}'` : '1=1';
    let querySql = query ? `route LIKE '%${query}%'` : '1=1';

    const [results] = (await this.storeConnection.query(`
      SELECT 
        route,
        COUNT(*) as total,
        SUM(CASE WHEN statusCode LIKE '2%' THEN 1 ELSE 0 END) as count_200,
        SUM(CASE WHEN statusCode LIKE '4%' THEN 1 ELSE 0 END) as count_400,
        SUM(CASE WHEN statusCode LIKE '5%' THEN 1 ELSE 0 END) as count_500,
        MIN(duration) as shortest,
        MAX(duration) as longest,
        AVG(duration) as average,
        CAST(
          SUBSTRING_INDEX(
            SUBSTRING_INDEX(
              GROUP_CONCAT(duration ORDER BY duration),
              ',',
              CEILING(COUNT(*) * 0.95)
            ),
            ',',
            -1
          ) AS DECIMAL(10,2)
        ) as p95
      FROM observatory_entries
      WHERE type = 'request'
        AND ${periodSql}
        AND ${routeSql}
        AND ${querySql}
      GROUP BY route
      ORDER BY total DESC
      LIMIT ${limit} 
      OFFSET ${offset}
    `)) as [any[]];

    return { results, count: results.length };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataKnex(filters: RequestFilters): Promise<any> {
    const { period, query, key, status } = filters;
    let routeSQL = (key ? this.getInclusionSQL(key, "route") : "").replace(/^AND/, "");
    let querySQL = (query ? this.getInclusionSQL(query, "route") : "").replace(/^AND/, "");
    let periodSQL = (period ? this.getPeriodSQL(period) : "").replace(/^AND/, "");
    let statusSQL = (status ? this.getStatusSQL(status) : "").replace(/^AND/, "");

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "request")
      .whereRaw(routeSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw(`
          CAST(
            SUBSTRING_INDEX(
              SUBSTRING_INDEX(
                GROUP_CONCAT(
                  CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))
                  ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))
                  SEPARATOR ','
                ),
                ',',
                CEILING(COUNT(*) * 0.95)
              ),
              ',',
              -1
            ) AS DECIMAL(10,2)
          ) AS p95
        `)
      )
      .first();

    // Get detailed data
    const results = await this.storeConnection("observatory_entries")
      .where("type", "request")
      .whereRaw(routeSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .select("created_at", "content")
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: aggregateResults.shortest ? parseFloat(aggregateResults.shortest).toFixed(2) : 0,
      longest: aggregateResults.longest ? parseFloat(aggregateResults.longest).toFixed(2) : 0,
      average: aggregateResults.average ? parseFloat(aggregateResults.average).toFixed(2) : 0,
      p95: aggregateResults.p95 ? parseFloat(aggregateResults.p95).toFixed(2) : 0,
    };
  }

  protected async getIndexGraphDataSQL(filters: RequestFilters): Promise<any> {
    const { period, key } = filters;
    const timeSql = period ? this.getPeriodSQL(period) : "";
    const routeSql = key ? this.getEqualitySQL(key, "route") : "";

    const [results] = (await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500,
          CAST(
            SUBSTRING_INDEX(
              SUBSTRING_INDEX(
                GROUP_CONCAT(
                  CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
                  ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))
                  SEPARATOR ','
                ),
                ',',
                CEILING(COUNT(*) * 0.95)
              ),
              ',',
              -1
            ) AS DECIMAL(10,2)
          ) AS p95,
          NULL as created_at,
          NULL as content,
          'aggregate' as type
        FROM observatory_entries
        WHERE type = 'request' ${routeSql} ${timeSql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as count_200,
          NULL as count_400,
          NULL as count_500,
          NULL as p95,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'request' ${routeSql} ${timeSql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
        ORDER BY created_at DESC
      );`
    )) as [any[], any];

    const aggregateResults: {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      count_200: string | null;
      count_400: string | null;
      count_500: string | null;
      p95: string | null;
    } = results.shift();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      indexCountOne: this.formatValue(aggregateResults.count_200, true),
      indexCountTwo: this.formatValue(aggregateResults.count_400, true),
      indexCountThree: this.formatValue(aggregateResults.count_500, true),
      count: this.formatValue(aggregateResults.total, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  };

  protected async getIndexGraphDataMongodb(filters: RequestFilters): Promise<any> {
    const match: any = { type: "request" };
    if (filters.period) {
      const minutes = this.periods[filters.period];
      match.created_at = { $gte: new Date(Date.now() - minutes * 60000) };
    }
    if (filters.key) {
      match["content.route"] = filters.key;
    }

    const pipeline = [
      { $match: match },
      // Convert duration to number.
      { $addFields: { duration: { $toDouble: "$content.duration" } } },
      {
        // Use $facet to run two pipelines: one for aggregates and one for rows.
        $facet: {
          aggregate: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                shortest: { $min: "$duration" },
                longest: { $max: "$duration" },
                average: { $avg: "$duration" },
                // Push durations for p95 calculation.
                durations: { $push: "$duration" }
              }
            },
            {
              // Compute p95 from the durations array.
              $project: {
                total: 1,
                shortest: 1,
                longest: 1,
                average: 1,
                p95: {
                  $let: {
                    vars: {
                      sorted: { $sortArray: { input: "$durations", sortBy: { $const: 1 } } },
                      // Use floor(totalCount * 0.95) as index.
                      idx: { $floor: { $multiply: [{ $size: "$durations" }, 0.95] } }
                    },
                    in: { $arrayElemAt: ["$$sorted", "$$idx"] }
                  }
                }
              }
            }
          ],
          rows: [
            // Return the matching documents sorted by created_at descending.
            { $sort: { created_at: -1 } }
          ]
        }
      },
      // Unpack the facet result.
      { $project: { aggregate: { $arrayElemAt: ["$aggregate", 0] }, rows: 1 } }
    ];

    const [result] = await this.storeConnection.db('observatory').collection("observatory_entries").aggregate(pipeline).toArray();

    // Format values to 2 decimals if needed.
    const aggregate = result.aggregate || {};
    const format = ((val: any) => (val != null ? parseFloat(val).toFixed(2) : "0"));
    const durationFormattedData = this.durationGraphData(result.rows, filters.period as string);
    const countFormattedData = this.countGraphData(result.rows, filters.period as string);

    return {
      results: result.rows,
      countFormattedData,
      durationFormattedData,
      count: aggregate.total,
      shortest: format(aggregate.shortest),
      longest: format(aggregate.longest),
      average: format(aggregate.average),
      p95: format(aggregate.p95)
    };
  }

  protected async getIndexGraphDataPrisma(filters: RequestFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? `created_at >= NOW() - INTERVAL '${this.periods[period]} minutes'` : "1=1";
    const routeFilter = key ? `content->>'route' = '${key}'` : "1=1";

    const [results] = await this.storeConnection.$queryRaw`
      (
        SELECT 
          COUNT(*) as total,
          MIN(CAST(content->>'duration' as DECIMAL(10,2))) as shortest,
          MAX(CAST(content->>'duration' as DECIMAL(10,2))) as longest,
          AVG(CAST(content->>'duration' as DECIMAL(10,2))) as average,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(content->>'duration' as DECIMAL(10,2))) as p95,
          NULL as created_at,
          NULL as content,
          'aggregate' as type
        FROM observatory_entries
        WHERE type = 'request' AND ${timeFilter} AND ${routeFilter}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'request' AND ${timeFilter} AND ${routeFilter}
        ORDER BY created_at DESC
      );
    `;

    const aggregateResults = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: aggregateResults.shortest ? parseFloat(aggregateResults.shortest).toFixed(2) : 0,
      longest: aggregateResults.longest ? parseFloat(aggregateResults.longest).toFixed(2) : 0,
      average: aggregateResults.average ? parseFloat(aggregateResults.average).toFixed(2) : 0,
      p95: aggregateResults.p95 ? parseFloat(aggregateResults.p95).toFixed(2) : 0
    };
  }

  protected async getIndexGraphDataTypeorm(filters: RequestFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? `created_at >= NOW() - INTERVAL '${this.periods[period]} minutes'` : "1=1";
    const routeFilter = key ? `content->>'route' = '${key}'` : "1=1";

    const [results] = await this.storeConnection.query(`
      (
        SELECT 
          COUNT(*) as total,
          MIN(CAST(content->>'duration' as DECIMAL(10,2))) as shortest,
          MAX(CAST(content->>'duration' as DECIMAL(10,2))) as longest,
          AVG(CAST(content->>'duration' as DECIMAL(10,2))) as average,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(content->>'duration' as DECIMAL(10,2))) as p95,
          NULL as created_at,
          NULL as content,
          'aggregate' as type
        FROM observatory_entries
        WHERE type = 'request' AND ${timeFilter} AND ${routeFilter}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'request' AND ${timeFilter} AND ${routeFilter}
        ORDER BY created_at DESC
      );
    `);

    const aggregateResults = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: aggregateResults.shortest ? parseFloat(aggregateResults.shortest).toFixed(2) : 0,
      longest: aggregateResults.longest ? parseFloat(aggregateResults.longest).toFixed(2) : 0,
      average: aggregateResults.average ? parseFloat(aggregateResults.average).toFixed(2) : 0,
      p95: aggregateResults.p95 ? parseFloat(aggregateResults.p95).toFixed(2) : 0
    };
  }

  protected async getIndexGraphDataSequelize(filters: RequestFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? `created_at >= NOW() - INTERVAL '${this.periods[period]} minutes'` : "1=1";
    const routeFilter = key ? `content->>'route' = '${key}'` : "1=1";

    const [results] = await this.storeConnection.query(`
      (
        SELECT 
          COUNT(*) as total,
          MIN(CAST(content->>'duration' as DECIMAL(10,2))) as shortest,
          MAX(CAST(content->>'duration' as DECIMAL(10,2))) as longest,
          AVG(CAST(content->>'duration' as DECIMAL(10,2))) as average,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(content->>'duration' as DECIMAL(10,2))) as p95,
          NULL as created_at,
          NULL as content,
          'aggregate' as type
        FROM observatory_entries
        WHERE type = 'request' AND ${timeFilter} AND ${routeFilter}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'request' AND ${timeFilter} AND ${routeFilter}
        ORDER BY created_at DESC
      );
    `);

    const aggregateResults = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: aggregateResults.shortest ? parseFloat(aggregateResults.shortest).toFixed(2) : 0,
      longest: aggregateResults.longest ? parseFloat(aggregateResults.longest).toFixed(2) : 0,
      average: aggregateResults.average ? parseFloat(aggregateResults.average).toFixed(2) : 0,
      p95: aggregateResults.p95 ? parseFloat(aggregateResults.p95).toFixed(2) : 0
    };
  }

  /**
   * Helper Methods
   * --------------------------------------------------------------------------
   */

  private getStatusSQL(type: string) {
    if (type === "all") return "";
    return `AND JSON_EXTRACT(content, '$.statusCode') LIKE '${type[0]}%'`;
  }

  protected countGraphData(data: any, period: string) {
    const totalDuration = this.periods[period as keyof typeof this.periods]; // Total duration in minutes
    const intervalDuration = totalDuration / 120; // Duration of each bar in minutes

    const now = new Date().getTime(); // Current timestamp in ms
    const startDate = now - totalDuration * 60 * 1000; // Start time in ms

    // Initialize grouped data
    const groupedData = Array.from({ length: 120 }, (_, index: number) => ({
      "200": 0,
      "400": 0,
      "500": 0,
      label: this.getLabel(index, period)
    }));

    // Group requests into intervals
    data.forEach((request: any) => {
      if(request.content.statusCode === 0) return;
      const requestTime = new Date(request.created_at).getTime();
      const statusCode = Math.floor(request.content.statusCode / 100) * 100;

      // Calculate which interval the request falls into
      const intervalIndex = Math.floor(
        (requestTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          //@ts-ignore
          [statusCode]: groupedData[intervalIndex][statusCode] + 1,
        };
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): RequestFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      index: req.query.index as "instance" | "group",
      status: req.query.status as "all" | "2xx" | "4xx" | "5xx",
      key: req.query.key
        ? decodeURIComponent(req.query.key as string)
        : "",
    };
  }
}

export default RequestWatcher;
