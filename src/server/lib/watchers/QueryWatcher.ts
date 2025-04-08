/** @format */

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface QueryFilters extends WatcherFilters {
  index: "instance" | "group";
  status: string;
  key: string;
}

class QueryWatcher extends BaseWatcher {
  readonly type = "query";

  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  protected getStatusSQL(status: string): string {
    switch (status) {
      case "select":
        return "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%SELECT%'";
      case "insert":
        return "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%INSERT%'";
      case "update":
        return "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%UPDATE%'";
      case "delete":
        return "JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) LIKE '%DELETE%'";
      default:
        return "";
    }
  }

  /**
   * View Methods
   * --------------------------------------------------------------------------
   */
  protected async handleViewKnex(id: string): Promise<any> {
    const results = await this.storeConnection("observatory_entries")
      .where({ uuid: id, type: this.type });

    const item = results[0];

    const relatedItems = await this.storeConnection("observatory_entries")
      .where({ request_id: item.request_id })
      .where({ job_id: item.job_id })
      .where({ schedule_id: item.schedule_id })
      .whereNot({ type: this.type });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSQL(id: string): Promise<any> {
    let [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE uuid = ? AND type = ?",
      [id, this.type]
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


    const [relatedItems]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE " + conditions.join(" OR ") + " AND type != ?",
      [...params, this.type]
    );

    return this.groupItemsByType(relatedItems.concat(results));
  }

  protected async handleViewMongodb(id: string): Promise<any> {
    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        $or: [
          { uuid: id, type: this.type },
        ]
      })
      .toArray();

    const item = results[0];

    const relatedItems = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({ request_id: item.request_id, job_id: item.job_id, schedule_id: item.schedule_id, type: { $ne: this.type } })
      .toArray(); 

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [
          { uuid: id, type: this.type },
        ]
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
      where: { request_id: item.request_id, job_id: item.job_id, schedule_id: item.schedule_id, type: { $ne: this.type } }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        OR: [
          { uuid: id, type: this.type },  
        ]
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: { request_id: item.request_id, job_id: item.job_id, schedule_id: item.schedule_id, type: { $ne: this.type } }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSequelize(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: { uuid: id, type: this.type },
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: { request_id: item.request_id, job_id: item.job_id, schedule_id: item.schedule_id, type: { $ne: this.type } }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  /**
   * Related Data Methods
   * --------------------------------------------------------------------------
   */
  protected async handleRelatedDataSQL(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    let source = "";
    let sourceId = "";

    if (requestId) {
      source = "request";
      sourceId = requestId;
    }

    if (jobId) {
      source = "job";
      sourceId = jobId;
    } 

    if (scheduleId) {
      source = "schedule";
      sourceId = scheduleId;
    }

    const [results]: [any[], any] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries WHERE ${source}_id = ? AND type = '${source}'`,
      [sourceId]
    );  

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataKnex(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection("observatory_entries")
      .where({ request_id: requestId })
      .where({ job_id: jobId })
      .where({ schedule_id: scheduleId })
      .whereNot({ type: this.type });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataMongodb(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({ request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { $ne: this.type } })
      .toArray();
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataPrisma(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        request_id: requestId,
        job_id: jobId,
        schedule_id: scheduleId,
        type: { $ne: this.type }
      } 
    });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataTypeorm(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({  
      where: {
        request_id: requestId,
        job_id: jobId,
        schedule_id: scheduleId,
        type: { $ne: this.type }
      }
    });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataSequelize(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: { request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { not: this.type } }
    });
    return this.groupItemsByType(results);
  }


  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceKnex(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "query") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'query' ${periodSQL} ${querySQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'query' ${periodSQL} ${querySQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query, status, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "query") : "";
    const keySql = key ? this.getEqualitySQL(key, "sql") : "";
    const statusSql = status !== "all" ? `AND ${this.getStatusSQL(status)}` : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'query' ${periodSql} ${querySql} ${statusSql} ${keySql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries
       WHERE type = 'query' ${periodSql} ${querySql} ${statusSql} ${keySql}`
    );

    return { results, count: countResult[0].total > 999 ? (countResult[0].total / 1000).toFixed(2) + "K" : countResult[0].total };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { query: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "query",
        ...timeFilter,
        ...queryFilter
      })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .countDocuments({
        type: "query",
        ...timeFilter,
        ...queryFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { query: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...periodFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...periodFilter,
        ...queryFilter  
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    let periodTypeormFilter = period ? { created_at: { gte: new Date(Date.now() - this.periods[period] * 60 * 1000) } } : {};
    let queryTypeormFilter = query ? { content: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {  
        ...periodTypeormFilter,
        ...queryTypeormFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    }); 

    return { results, count: results.length }; 
  }

  protected async getIndexTableDataByInstanceSequelize(filters: QueryFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { content: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...queryFilter,
        type: "query"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    return { results, count: results.length };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupKnex(filters: QueryFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "query") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "query")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.query")) as query'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.error") IS NOT NULL THEN 1 ELSE 0 END) as errors')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.query"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "query")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.query"))'));

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

  protected async getIndexTableDataByGroupSQL(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "endpoint") : "";

    const [results] = await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql')) as endpoint,
        COUNT(*) as total,
        AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL)) as duration,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
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
        WHERE type = 'query' ${periodSql} ${querySql}
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql'))
        ORDER BY total DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.sql'))) as total
       FROM observatory_entries
       WHERE type = 'query' ${periodSql} ${querySql}`
    );

    return { results, count: countResult[0].total > 999 ? (countResult[0].total / 1000).toFixed(2) + "K" : countResult[0].total };
  }

  protected async getIndexTableDataByGroupMongodb(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { sql: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "query",
            ...timeFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$sql",
            endpoint: { $first: "$sql" },
            total: { $sum: 1 },
            duration: { $avg: "$duration" }
          }
        },
        {
          $sort: { total: -1 }
        },
        {
          $skip: offset
        },
        {
          $limit: limit
        }
      ])
      .toArray();

    const uniqueQueries = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .distinct("sql", {
        type: "query",
        ...timeFilter,
        ...queryFilter
      });

    results.forEach((result: any) => {
      result.duration = result.duration ? parseFloat(result.duration).toFixed(2) : 0;
    });

    return { results, count: uniqueQueries.length };
  }

  protected async getIndexTableDataByGroupPrisma(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { endpoint: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...periodFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    }); 

    return { results, count: results.length };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: QueryFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    let periodTypeormFilter = period ? { created_at: { gte: new Date(Date.now() - this.periods[period] * 60 * 1000) } } : {};
    let queryTypeormFilter = query ? { content: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {  
        ...periodTypeormFilter,
        ...queryTypeormFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    }); 

    return { results, count: results.length };
  }

  protected async getIndexTableDataByGroupSequelize(filters: QueryFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { content: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["endpoint"],
      _count: true,
      _sum: {
        duration: true
      }
    }, {
      where: {  
        ...queryFilter,
        type: "query"
      },
      orderBy: { created_at: "desc" },
      offset,
      limit
    });   

    return { results, count: results.length };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataKnex(filters: QueryFilters): Promise<any> {
    const { period, query } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getEqualitySQL(query, "query") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "query")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.error") IS NOT NULL THEN 1 ELSE 0 END) as errors'),
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
      .where("type", "query")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select("created_at", "content")
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      errors: aggregateResults.errors,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: QueryFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getEqualitySQL(key, "sql") : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
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
        WHERE type = 'query' ${periodSql} ${keySql}
      )
      UNION ALL
      (
        SELECT 
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          NULL as completed,
          NULL as failed,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'query' ${periodSql} ${keySql}
        ORDER BY created_at DESC
      );`
    );

    const aggregateResults = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.completed, true),
      indexCountTwo: this.formatValue(aggregateResults.failed, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  }

  protected async getIndexGraphDataMongodb(filters: QueryFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "query",
            ...timeFilter
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            shortest: { $min: "$duration" },
            longest: { $max: "$duration" },
            average: { $avg: "$duration" }
          }
        }
      ])
      .toArray();

    const queries = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "query",
        ...timeFilter
      })
      .toArray();

    const countFormattedData = this.countGraphData(queries, period as string);
    const durationFormattedData = this.durationGraphData(queries, period as string);
    const aggregateResults = results[0] || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: queries,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataPrisma(filters: QueryFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter
      },  
      orderBy: { created_at: "desc" },
    });

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataTypeorm(filters: QueryFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter
      },  
      orderBy: { created_at: "desc" },
    });

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataSequelize(filters: QueryFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter
      },  
      orderBy: { created_at: "desc" }
    });

    return this.durationGraphData(results, period as string);
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
      completed: 0,
      failed: 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((query: any) => {
      const queryTime = new Date(query.created_at).getTime();
      const queryStatus = query.content.status;

      const intervalIndex = Math.floor(
        (queryTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          // @ts-ignore
          [queryStatus]: groupedData[intervalIndex][queryStatus] + 1,
        };
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): QueryFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "group" | "instance",
      status: req.query.status as string,
      key: req.query.key as string,
    };
  }
}

export default QueryWatcher;
