/** @format */

import { Request } from "express";
import { StoreDriver, HttpRequestData } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";
import { standardizeHttpRequestData } from "../utils";

interface HTTPClientFilters extends WatcherFilters {
  key?: string;
  index: "instance" | "group";
  status: "all" | "2xx" | "4xx" | "5xx";
}

class HTTPClientWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "http";

  /**
   * Constructor & Initialization
   * --------------------------------------------------------------------------
   */
  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  private getStatusSQL(status: string): string {
    return status === "all"
      ? ""
      : `AND JSON_EXTRACT(content, '$.statusCode') LIKE '${status.replace('xx', '%')}'`;
  }

  /**
   * View Methods
   * --------------------------------------------------------------------------
   */

  protected async handleViewSQL(id: string): Promise<any> {
   let [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE uuid = ?",
      [id]
    );

    let item = results[0];

    let conditions = [];
    let params = [];

    if (item.request_id) {
      conditions.push("request_id = ?");
      params.push(item.request_id);
    }

    if (item.schedule_id) {
      conditions.push("schedule_id = ?");
      params.push(item.schedule_id);
    }

    if (item.job_id) {
      conditions.push("job_id = ?");
      params.push(item.job_id);
    }

    let jobCondition = ''

    if(item.job_id) {
      jobCondition = "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')";
    }

    if(!item.request_id && !item.schedule_id && !item.job_id) {
      return this.groupItemsByType(results);
    }

    const [relatedItems]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE " + conditions.join(" OR ") + " AND type != ? " + jobCondition,
      [...params, this.type]
    );

    return this.groupItemsByType(relatedItems.concat(results));
  }

  protected async handleViewKnex(id: string): Promise<any> {
    const results = await this.storeConnection("observatory_entries")
      .where("uuid", id)

    const item = results[0];

    const relatedItems = await this.storeConnection("observatory_entries")
      .where("request_id", item.request_id)
      .where("job_id", item.job_id)
      .where("schedule_id", item.schedule_id)
      .whereNot("type", "http");

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewMongodb(id: string): Promise<any> {
    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        uuid: id,
        type: "http"
      })
      .toArray();

    const item = results[0];

    const relatedItems = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        request_id: item.request_id,
        job_id: item.job_id,
        schedule_id: item.schedule_id,
        type: { $ne: "http" }
      })
      .toArray();

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        uuid: id,
        type: "http"
      }
    });

    const item = results[0];
    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
      where: {
        request_id: item.request_id,
        job_id: item.job_id,
        schedule_id: item.schedule_id,
        type: { not: "http" }
      }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        uuid: id,
        type: "http"
      }
    });

    const item = results[0];
    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: {
        request_id: item.request_id,
        job_id: item.job_id,
        schedule_id: item.schedule_id,
        type: { not: "http" }
      }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSequelize(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        uuid: id,
        type: this.type
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: {
        request_id: item.request_id,
        job_id: item.job_id,
        schedule_id: item.schedule_id,
        type: { not: this.type }
      }
    }); 

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  } 

  /**
   * Related Data Methods
   * --------------------------------------------------------------------------
   */
  protected async handleRelatedDataSQL(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    let query = 'SELECT * FROM observatory_entries WHERE type != ?';

    if(requestId) {
      query += ` AND request_id = '${requestId}'`;
    } 

    if (jobId) {
      let jobFilter = "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')";
      query += ` AND job_id = '${jobId}' ${jobFilter}`;
    }

    if(scheduleId) {
      query += ` AND schedule_id = '${scheduleId}'`;
    }

    if(!requestId && !jobId && !scheduleId) {
      return {}
    }

    const [results]: [any[], any] = await this.storeConnection.query(query, [this.type]);
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataKnex(batchId: string): Promise<any> {
    return this.storeConnection("observatory_entries")
      .where({ batch_id: batchId })
      .whereNot({ type: "http" });
  }

  protected async handleRelatedDataMongodb(batchId: string): Promise<any> {
    return this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({ batch_id: batchId, type: { $ne: "http" } })
      .toArray();
  }

  protected async handleRelatedDataPrisma(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        batch_id: batchId,
        type: { not: "http" }
      }
    });
    return results;
  }

  protected async handleRelatedDataTypeorm(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        batchId: batchId,
        type: { not: "http" }
      }
    });
    return results;
  } 

  protected async handleRelatedDataSequelize(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        batch_id: batchId,
        type: { not: this.type }
      }
    });
    return this.groupItemsByType(results);  
  } 

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */

  protected async getIndexTableDataByInstanceSQL(filters: HTTPClientFilters): Promise<any> {
    const { period, query, status, key, limit, offset } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "origin") : "";
    const statusSql = this.getStatusSQL(status);
    const keySql = key ? this.getInclusionSQL(key, "origin") : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'http' ${periodSql} ${querySql} ${statusSql} ${keySql}
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}` 
    );
    
    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) AS total FROM observatory_entries
       WHERE type = 'http' ${periodSql} ${querySql} ${statusSql} ${keySql}
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByInstanceKnex(filters: HTTPClientFilters): Promise<any> {
    const { period, query, status, key, limit, offset } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "request.url") : "";
    const statusSQL = this.getStatusSQL(status);
    const keySQL = key ? this.getEqualitySQL(key, "request.url") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "http")
      .whereRaw(periodSQL)
      .whereRaw(querySQL)
      .whereRaw(statusSQL)
      .whereRaw(keySQL)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "http")
      .whereRaw(periodSQL)
      .whereRaw(querySQL)
      .whereRaw(statusSQL)
      .whereRaw(keySQL)
      .count();

    return { results, count: count[0].count };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: HTTPClientFilters): Promise<any> {
    const { period, query, status, key, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "request.url": { $regex: query } } : {};
    const statusFilter = status === "all" ? {} : {
      "response.statusCode": { $regex: `^${status[0]}` }
    };
    const keyFilter = key ? { "request.url": key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "http",
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .countDocuments({
        type: "http",
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: HTTPClientFilters): Promise<any> {
    const { period, query, status, key, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { route: { contains: query } } : {};
    const statusFilter = status ? { statusCode: { contains: status[0] } } : {};
    const keyFilter = key ? { route: key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({  
      where: {
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      } 
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: HTTPClientFilters): Promise<any> {
    const { period, query, status, key, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { route: { contains: query } } : {};
    const statusFilter = status ? { statusCode: { contains: status[0] } } : {};
    const keyFilter = key ? { route: key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({  
      where: {
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({ 
      where: {
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      }
    }); 

    return { results, count };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: HTTPClientFilters): Promise<any> {
    const { period, query, status, key, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { route: { contains: query } } : {};
    const statusFilter = status ? { statusCode: { contains: status[0] } } : {};
    const keyFilter = key ? { route: key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({ 
      where: {
        ...periodFilter,
        ...queryFilter,
        ...statusFilter,
        ...keyFilter
      }
    });  

    return { results, count };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(filters: HTTPClientFilters): Promise<any> {
    const { period, query, key, limit, offset } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "request.url") : "";
    const keySql = key ? this.getEqualitySQL(key, 'request.url') : "";


    const [results] = await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.origin')) AS url,
        COUNT(*) AS total,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '2%' THEN 1 ELSE 0 END) AS count_200,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '4%' THEN 1 ELSE 0 END) AS count_400,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '5%' THEN 1 ELSE 0 END) AS count_500,
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
        WHERE type = 'http' ${periodSql} ${querySql} ${keySql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.origin'))
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset}`
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.origin'))) as total 
       FROM observatory_entries 
       WHERE type = 'http' ${periodSql} ${querySql} ${keySql}
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupKnex(filters: HTTPClientFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "url") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "http_client")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.url")) as url'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "2%" THEN 1 ELSE 0 END) as count_200'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "4%" THEN 1 ELSE 0 END) as count_400'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "5%" THEN 1 ELSE 0 END) as count_500')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.url"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "http_client")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.url"))'));

    return {
      results: results.map((row: any) => ({
        ...row,
        shortest: parseFloat(row.shortest || 0).toFixed(2),
        longest: parseFloat(row.longest || 0).toFixed(2),
        average: parseFloat(row.average || 0).toFixed(2)
      })),
      count: count[0]['count']
    };
  }

  protected async getIndexTableDataByGroupMongodb(filters: HTTPClientFilters): Promise<any> {
    const { period, query, key, limit, offset } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "request.url": { $regex: query } } : {};
    const keyFilter = key ? { "request.url": key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "http",
            ...timeFilter,
            ...queryFilter,
            ...keyFilter
          }
        },
        {
          $group: {
            _id: "$request.url",
            url: { $first: "$request.url" },
            total: { $sum: 1 },
            count_200: {
              $sum: {
                $cond: [{ $regexMatch: { input: "$response.statusCode", regex: "^2" } }, 1, 0]
              }
            },
            count_400: {
              $sum: {
                $cond: [{ $regexMatch: { input: "$response.statusCode", regex: "^4" } }, 1, 0]
              }
            },
            count_500: {
              $sum: {
                $cond: [{ $regexMatch: { input: "$response.statusCode", regex: "^5" } }, 1, 0]
              }
            },
            shortest: { $min: "$duration" },
            longest: { $max: "$duration" },
            average: { $avg: "$duration" },
            durations: { $push: "$duration" }
          }
        },
        {
          $addFields: {
            p95: {
              $arrayElemAt: [
                "$durations",
                { $floor: { $multiply: [{ $size: "$durations" }, 0.95] } }
              ]
            }
          }
        },
        { $sort: { total: -1 } },
        { $skip: offset },
        { $limit: limit }
      ])
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .distinct("request.url", {
        type: "http",
        ...timeFilter,
        ...queryFilter,
        ...keyFilter
      });

    return { results, count: count.length };
  }

  protected async getIndexTableDataByGroupPrisma(filters: HTTPClientFilters): Promise<any> {
    const { period, query, key, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { route: { contains: query } } : {};
    const keyFilter = key ? { route: key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...periodFilter,
        ...queryFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...periodFilter,
        ...queryFilter,
        ...keyFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: HTTPClientFilters): Promise<any> {
    const { period, query, key, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { route: { contains: query } } : {};
    const keyFilter = key ? { route: key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...periodFilter,
        ...queryFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit 
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...periodFilter,
        ...queryFilter,
        ...keyFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByGroupSequelize(filters: HTTPClientFilters): Promise<any> {
    const { period, query, key, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { route: { contains: query } } : {};
    const keyFilter = key ? { route: key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {  
        ...periodFilter,
        ...queryFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit 
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...periodFilter,
        ...queryFilter, 
        ...keyFilter
      }
    });

    return { results, count };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataSQL(filters: HTTPClientFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getInclusionSQL(key, 'origin') : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as shortest,
          MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as longest,
          AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500,
          CAST(
            SUBSTRING_INDEX(
              SUBSTRING_INDEX(
                GROUP_CONCAT(
                  CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))
                  ORDER BY CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))
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
        WHERE type = 'http' ${periodSql} ${keySql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          NULL as count_200,
          NULL as count_400,
          NULL as count_500,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'http' ${periodSql} ${keySql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
        ORDER BY created_at DESC
      );`
    );

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
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.count_200, true),
      indexCountTwo: this.formatValue(aggregateResults.count_400, true),
      indexCountThree: this.formatValue(aggregateResults.count_500, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  }

  protected async getIndexGraphDataKnex(filters: HTTPClientFilters): Promise<any> {
    const { period, key } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const keySQL = key ? this.getEqualitySQL(key, "origin") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "http_client")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "2%" THEN 1 ELSE 0 END) as count_200'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "4%" THEN 1 ELSE 0 END) as count_400'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.statusCode") LIKE "5%" THEN 1 ELSE 0 END) as count_500'),
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
      .where("type", "http_client")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .select("created_at", "content")
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total > 999 ? (aggregateResults.total / 1000).toFixed(2) + "K" : aggregateResults.total,
      count_200: aggregateResults.count_200 > 999 ? (aggregateResults.count_200 / 1000).toFixed(2) + "K" : aggregateResults.count_200,
      count_400: aggregateResults.count_400 > 999 ? (aggregateResults.count_400 / 1000).toFixed(2) + "K" : aggregateResults.count_400,
      count_500: aggregateResults.count_500 > 999 ? (aggregateResults.count_500 / 1000).toFixed(2) + "K" : aggregateResults.count_500,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataMongodb(filters: HTTPClientFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { "request.url": key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: { 
            type: "http",
            ...timeFilter,
            ...keyFilter
          }
        },
        {
          $group: {
            _id: "$request.url",
            url: { $first: "$request.url" },
            total: { $sum: 1 },
            count_200: {
              $sum: {
                $cond: [{ $regexMatch: { input: "$response.statusCode", regex: "^2" } }, 1, 0]
              }
            },
            count_400: {
              $sum: {
                $cond: [{ $regexMatch: { input: "$response.statusCode", regex: "^4" } }, 1, 0]
              }
            },
            count_500: {
              $sum: {
                $cond: [{ $regexMatch: { input: "$response.statusCode", regex: "^5" } }, 1, 0]
              } 
            },
            shortest: { $min: "$duration" },
            longest: { $max: "$duration" },
            average: { $avg: "$duration" },
            durations: { $push: "$duration" }
          } 
        },
        {
          $addFields: {
            p95: {
              $arrayElemAt: [
                "$durations",
                { $floor: { $multiply: [{ $size: "$durations" }, 0.95] } }
              ]
            }
          },
          $sort: { total: -1 }
        },
      ])
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .distinct("_id", {
        type: "http",
        ...timeFilter,
        ...keyFilter  
      });

    const durationFormattedData = this.durationGraphData(results, period as string);
    const countFormattedData = this.countGraphData(results, period as string);

    return { results, count: count.length, durationFormattedData, countFormattedData };
  }

  protected async getIndexGraphDataPrisma(filters: HTTPClientFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { "content": { path: ["request", "url"], equals: key } } : {};

    // First get aggregated stats
    const results = await this.storeConnection.$queryRaw`
      SELECT 
        COUNT(*) as total,
        MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as shortest,
        MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as longest,
        AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as average
      FROM observatory_entries 
      WHERE type = 'http'
    `;

    // Then get all requests for graphs
    const requests = await this.storeConnection.observatoryEntry.findMany({
      where: {
        type: 'http',
        ...timeFilter,
        ...keyFilter
      },
      orderBy: { created_at: 'desc' }
    });

    const countFormattedData = this.countGraphData(requests, period as string);
    const durationFormattedData = this.durationGraphData(requests, period as string);
    const aggregateResults = results[0] || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: requests,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortestRequest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longestRequest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      requestAverageTime: parseFloat(aggregateResults.average || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataTypeorm(filters: HTTPClientFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { "request.url": key } : {};

    // First get aggregated stats using query builder
    const stats = await this.storeConnection.observatoryEntry
      .createQueryBuilder('entry')
      .select('COUNT(*)', 'total')
      .addSelect('MIN(CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2)))', 'shortest')
      .addSelect('MAX(CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2)))', 'longest')
      .addSelect('AVG(CAST(JSON_EXTRACT(content, "$.duration") AS DECIMAL(10,2)))', 'average')
      .where('type = :type', { type: 'http' })
      .andWhere(timeFilter.created_at ? 'created_at >= :date' : '1=1', 
        timeFilter.created_at ? { date: timeFilter.created_at.gte } : {})
      .andWhere(keyFilter["request.url"] ? 'JSON_EXTRACT(content, "$.request.url") = :url' : '1=1',
        keyFilter["request.url"] ? { url: keyFilter["request.url"] } : {})
      .getRawOne();

    // Then get all requests for graphs
    const requests = await this.storeConnection.observatoryEntry.find({
      where: {
        type: 'http',
        ...timeFilter,
        ...keyFilter
      },
      order: { created_at: 'DESC' }
    });

    const countFormattedData = this.countGraphData(requests, period as string);
    const durationFormattedData = this.durationGraphData(requests, period as string);
    const aggregateResults = stats || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: requests,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortestRequest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longestRequest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      requestAverageTime: parseFloat(aggregateResults.average || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSequelize(filters: HTTPClientFilters): Promise<any> {
    const { period, key} = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const keyFilter = key ? { "request.url": key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...periodFilter,  
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
    }); 

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...periodFilter,
        ...keyFilter
      }
    });

    return { results, count };
  }

  /**
   * Helper Methods
   * --------------------------------------------------------------------------
   */
  protected countGraphData(data: any, period: string) {
    const totalDuration = this.periods[period as keyof typeof this.periods];
    const intervalDuration = totalDuration / 120;
    const now = new Date().getTime();
    const startDate = now - totalDuration * 60 * 1000;

    const groupedData = Array.from({ length: 120 }, (_, index) => ({
      "200": 0,
      "400": 0,
      "500": 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((request: any) => {
      if(request.content.statusCode === 0) return;
      const requestTime = new Date(request.created_at).getTime();
      const statusCode = Math.floor(request.content.statusCode / 100) * 100;
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

  protected extractFiltersFromRequest(req: Request): HTTPClientFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      index: req.query.index as "instance" | "group",
      status: req.query.status as "all" | "2xx" | "4xx" | "5xx",
      key: req.query.key ? decodeURIComponent(req.query.key as string) : undefined,
    };
  }
  
  /**
   * Add content to the watcher
   * --------------------------------------------------------------------------
   */
  async addContent(content: { [key: string]: any }): Promise<void> {
    // Standardize the HTTP request data to ensure consistent structure
    const standardizedContent = standardizeHttpRequestData(content);
    await super.addContent(standardizedContent);
  }

  /**
   * Get a list of HTTP requests with standardized data
   * This is useful for displaying in tables or lists
   *
   * @param limit Maximum number of requests to return
   * @param offset Pagination offset
   * @param filters Optional filters to apply
   * @returns Array of standardized HTTP request data
   */
  async getStandardizedRequests(
    limit: number = 20,
    offset: number = 0,
    filters: Partial<HTTPClientFilters> = {}
  ): Promise<HttpRequestData[]> {
    // Create default filters
    const defaultFilters: HTTPClientFilters = {
      period: '24h',
      offset,
      limit,
      status: 'all',
      index: 'instance',
      isTable: true
    };

    try {
    // Merge with provided filters
      const mergedFilters = { ...defaultFilters, ...filters };

      // Get raw data based on store driver
      let results: any[] = [];

      switch (this.storeDriver) {
        case 'mysql':
        case 'mysql2':
        case 'postgres':
        case 'sqlite3':
          const data = await this.getIndexTableDataByInstanceSQL(mergedFilters);
          results = data.results || [];
          break;
        case 'mongodb':
          const mongoData = await this.getIndexTableDataByInstanceMongodb(mergedFilters);
          results = mongoData.results || [];
          break;
        case 'knex':
          const knexData = await this.getIndexTableDataByInstanceKnex(mergedFilters);
          results = knexData.results || [];
          break;
        case 'prisma':
          const prismaData = await this.getIndexTableDataByInstancePrisma(mergedFilters);
          results = prismaData.results || [];
          break;
        case 'typeorm':
          const typeormData = await this.getIndexTableDataByInstanceTypeorm(mergedFilters);
          results = typeormData.results || [];
          break;
        case 'sequelize':
          const sequelizeData = await this.getIndexTableDataByInstanceSequelize(mergedFilters);
          results = sequelizeData.results || [];
          break;
        default:
          throw new Error(`Unsupported store driver: ${this.storeDriver}`);
      }

      // Standardize each result
      return results.map(item => {
        let content: any;

        try {
          // Parse content if it's a string
          content = typeof item.content === 'string'
            ? JSON.parse(item.content)
            : item.content;
        } catch (error: any) {
          console.error(`Failed to parse HTTP request data: ${error.message}`);
          content = {};
        }

        // Add metadata from the database record
        content.uuid = item.uuid;
        content.created_at = item.created_at;
        content.requestId = item.request_id;
        content.jobId = item.job_id;
        content.scheduleId = item.schedule_id;

        // Standardize the data
        return standardizeHttpRequestData(content);
      });
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}

export default HTTPClientWatcher;
