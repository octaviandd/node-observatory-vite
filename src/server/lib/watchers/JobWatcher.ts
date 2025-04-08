/** @format */

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface JobFilters extends WatcherFilters {
  index: "instance" | "group";
  jobStatus: "all" | "released" | "failed" | "completed";
  queueFilter: "all" | "errors" | "slow";
  key?: string;
}

class JobWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "job";

  /**
   * Constructor & Initialization
   * --------------------------------------------------------------------------
   */
  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
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
      .where({ request_id: item.request_id, job_id: item.job_id, schedule_id: item.schedule_id })
      .whereNot({ type: this.type });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSQL(id: string): Promise<any> {
    let [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE uuid = ?",
      [id]
    );

    let item = results[0];

    const [relatedItems]: [any[], any] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries WHERE job_id = ? OR (request_id = ? AND type = 'request') AND type != ?`,
      [item.job_id, item.request_id, this.type]
    );

    results = results.concat(relatedItems);
    return this.groupItemsByType(results);
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

    const relatedItems = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        request_id: id,
        job_id: id,
        schedule_id: id,
        type: { $ne: this.type }    
      })
      .toArray();

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [{ uuid: id, type: this.type }],
      },
    });

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
      where: {
        request_id: id,
        job_id: id,
        schedule_id: id,
        type: { not: this.type }
      },
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [{ uuid: id, type: this.type }],
      },
    });

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
      where: {
        request_id: id,
        job_id: id,
        schedule_id: id,
        type: { not: this.type }
      },
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSequelize(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findAll({
      where: {
        OR: [{ uuid: id, type: this.type }],
      },
    });

    const relatedItems = await this.storeConnection.observatoryEntry.findAll({
      where: {
        request_id: id,
        job_id: id,
        schedule_id: id,
        type: { not: this.type }
      },
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  /**
   * Related Data Methods
   * --------------------------------------------------------------------------
   */
  protected async handleRelatedDataSQL(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    let params = [];

    if (requestId) {
      params.push(requestId);
    }

    if (jobId) {
      params.push(jobId);
    } 

    if (scheduleId) {
      params.push(scheduleId);
    }

    params.push(this.type);

    const [results]: [any[], any] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries WHERE ${
        requestId ? 'request_id = ? OR ' : ''
      }${
        jobId ? 'job_id = ? OR ' : '' 
      }${
        scheduleId ? 'schedule_id = ? OR ' : ''
      }type != ?`.replace(/OR\s+type/, 'AND type'),
      params
    );

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataKnex(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection("observatory_entries")
      .where({ request_id: requestId, job_id: jobId, schedule_id: scheduleId })
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
      where: { request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { not: this.type } },
    });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataTypeorm(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: { request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { not: this.type } },
    });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataSequelize(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findAll({
      where: { request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { not: this.type } },
    });
    return this.groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceKnex(filters: JobFilters): Promise<any> {
    const { period, key, jobStatus, limit, offset } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const queueSQL = key ? this.getEqualitySQL(key, "queue") : "";
    const statusSQL = jobStatus !== "all" ? this.getEqualitySQL(jobStatus, "status") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "job")
      .whereRaw(periodSQL)
      .whereRaw(queueSQL)
      .whereRaw(statusSQL)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "job")
      .whereRaw(periodSQL)
      .whereRaw(queueSQL)
      .whereRaw(statusSQL)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: JobFilters): Promise<any> {
    const { period, limit, offset, jobStatus, key } = filters;
    let periodSql = period ? this.getPeriodSQL(period) : "";
    let queueSql = key ? this.getEqualitySQL(key, "queue") : "";
    let typeSql = "";

    if (jobStatus === "all") {
      typeSql = `AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')`;
    } else {
      typeSql = this.getEqualitySQL(jobStatus, "status");
    }

   const [results] = (await this.storeConnection.query(`
    SELECT *, 
      CASE 
        WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1
        WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' THEN 2
        WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 3
        ELSE 4
      END AS status_priority
    FROM observatory_entries
    WHERE type = 'job' AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.method')) = 'processJob'
    ${typeSql} ${periodSql} ${queueSql}
    ORDER BY created_at DESC, status_priority DESC
    LIMIT ${limit} OFFSET ${offset}
  `)) as [any[]];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries WHERE type = 'job' ${typeSql} ${periodSql} ${queueSql}`
    )) as [any[]];

    const count = countResult[0].total > 999 ? (countResult[0].total / 1000).toFixed(2) + "K" : countResult[0].total;
    return { results, count };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: JobFilters): Promise<any> {
    const { period, key, jobStatus, limit, offset } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};
    const statusFilter = jobStatus !== "all" ? { status: jobStatus } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "job",
        ...timeFilter,
        ...queueFilter,
        ...statusFilter
      })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .countDocuments({
        type: "job",
        ...timeFilter,
        ...queueFilter,
        ...statusFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: JobFilters): Promise<any> {
    const { period, key, jobStatus, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};
    const statusFilter = jobStatus !== "all" ? { status: jobStatus } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...periodFilter,
        ...queueFilter,
        ...statusFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...periodFilter,
        ...queueFilter,
        ...statusFilter
      }
    });

    return { results, count };  
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: JobFilters): Promise<any> {
    const { period, key, jobStatus, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: { 
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};
    const statusFilter = jobStatus !== "all" ? { status: jobStatus } : {};  

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...periodFilter,
        ...queueFilter,
        ...statusFilter
      },  
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({ 
      where: {
        ...periodFilter,
        ...queueFilter,
        ...statusFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: JobFilters): Promise<any> {
    const { period, key, jobStatus, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};
    const statusFilter = jobStatus !== "all" ? { status: jobStatus } : {};

    const results = await this.storeConnection.observatoryEntry.findAll({
      where: {
        ...periodFilter,
        ...queueFilter,
        ...statusFilter
      },
      order: [["created_at", "DESC"]],
      offset, 
      limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {  
        ...periodFilter,
        ...queueFilter,
        ...statusFilter
      }
    });

    return { results, count };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(filters: JobFilters): Promise<any> {
    const { period, query, limit, offset, queueFilter } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "queue") : "";

      let orderBySql =
      queueFilter === "all"
        ? "ORDER BY total DESC"
        : queueFilter === "errors"
        ? "ORDER BY failed DESC"
            : "ORDER BY average DESC";
    
    const [results] = (await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.queue')) AS queue,
        COUNT(*) AS total,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' THEN 1 ELSE 0 END) AS released,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) AS failed,
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
      WHERE type = 'job' ${periodSql} ${querySql}
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.queue'))
      ${orderBySql}
      LIMIT ${limit} OFFSET ${offset};`
    )) as [any];

     const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.queue'))) as total FROM observatory_entries WHERE type = 'job' ${periodSql} ${querySql}`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupKnex(filters: JobFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "jobId") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "job")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.jobId")) as jobId'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "completed" THEN 1 ELSE 0 END) as completed'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "failed" THEN 1 ELSE 0 END) as failed'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "running" THEN 1 ELSE 0 END) as running')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.jobId"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "job")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.jobId"))'));

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

  protected async getIndexTableDataByGroupMongodb(filters: JobFilters): Promise<any> {
    const { period, query, limit, offset } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { queue: { $regex: query } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "job",
            ...timeFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$queue",
            queue: { $first: "$queue" },
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
            },
            shortest: { $min: "$duration" },
            longest: { $max: "$duration" },
            average: { $avg: "$duration" }
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
      .distinct("queue", {
        type: "job",
        ...timeFilter,
        ...queryFilter
      });

    return { results, count: count.length };
  }

  protected async getIndexTableDataByGroupPrisma(filters: JobFilters): Promise<any> {
    const { period, query, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { queue: { $regex: query } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["queue"],
      _count: true, 
      _min: { created_at: true },
      _max: { created_at: true }
    }, {
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

  protected async getIndexTableDataByGroupTypeorm(filters: JobFilters): Promise<any> {
    const { period, query, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { queue: { $regex: query } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({ 
      by: ["queue"],
      _count: true,
      _min: { created_at: true },
      _max: { created_at: true }
    }, {
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

  protected async getIndexTableDataByGroupSequelize(filters: JobFilters): Promise<any> {  
    const { period, query, limit, offset } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { queue: { $regex: query } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["queue"],
      _count: true,
      _min: { created_at: true },
      _max: { created_at: true }
    }, {
      where: {
        ...periodFilter,
        ...queryFilter
      },
      order: [["created_at", "DESC"]],
      skip: offset,
      take: limit
    });

    return { results, count: results.length };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataKnex(filters: JobFilters): Promise<any> {
    const { period, key, jobStatus } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const queueSQL = key ? this.getEqualitySQL(key, "queue") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "job")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(queueSQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "completed" THEN 1 ELSE 0 END) as completed'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "failed" THEN 1 ELSE 0 END) as failed'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "running" THEN 1 ELSE 0 END) as running'),
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
      .where("type", "job")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(queueSQL || "1=1")
      .select("created_at", "content")
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      completed: aggregateResults.completed,
      failed: aggregateResults.failed,
      running: aggregateResults.running,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: JobFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const queueSql = key ? this.getEqualitySQL(key, "queue") : "";

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries WHERE type = 'job' AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed') ${periodSql} ${queueSql}`
    )) as [any[]];

    const [results] = (await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
         CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' THEN 1 ELSE 0 END) as released,
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
        WHERE type = 'job' ${periodSql} ${queueSql} AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as completed,
          NULL as failed,
          NULL as released,
          NULL as p95,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'job' ${periodSql} ${queueSql} AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'released' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')
        ORDER BY created_at DESC
      );`
    )) as [any[], any];

    const aggregateResults: {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      p95: string | null;
      completed: string | null;
      failed: string | null;
      released: string | null;
    } = results.shift();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(countResult[0].total, true),
      indexCountOne: this.formatValue(aggregateResults.completed, true),
      indexCountTwo: this.formatValue(aggregateResults.released, true),
      indexCountThree: this.formatValue(aggregateResults.failed, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  }

  protected async getIndexGraphDataMongodb(filters: JobFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "job",
        ...timeFilter,
        ...queueFilter
      })
      .toArray();

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataPrisma(filters: JobFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};

    const results = await this.storeConnection.$queryRaw`
      SELECT
        queue,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        MIN(duration) as shortest,
        MAX(duration) as longest,
        AVG(duration) as average  
      FROM observatory_entries
    `;

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataTypeorm(filters: JobFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["queue"],
      _count: true, 
      _min: { created_at: true }, 
      _max: { created_at: true }
    }, {
      where: {
        ...timeFilter,
        ...queueFilter
      },
      orderBy: { created_at: "desc" }
    });

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataSequelize(filters: JobFilters): Promise<any> {
    const { period, key } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queueFilter = key ? { queue: { $regex: key } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["queue"],
      _count: true,
      _min: { created_at: true },
      _max: { created_at: true }
    }, {
      where: {
        ...periodFilter,
        ...queueFilter  
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
      released: 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((job: any) => {
      if (
        job.content.method === "processJob" &&
        (job.content.status === "completed" ||
          job.content.status === "failed" ||
          job.content.status === "released")
      ) {
        const jobTime = new Date(job.created_at).getTime();
        const status = job.content.status;
        const intervalIndex = Math.floor(
          (jobTime - startDate) / (intervalDuration * 60 * 1000)
        );

        if (intervalIndex >= 0 && intervalIndex < 120) {
          if (status === "completed") {
            groupedData[intervalIndex].completed++;
          } else if (status === "failed") {
            groupedData[intervalIndex].failed++;
          } else if (status === "released") {
            groupedData[intervalIndex].released++;
          }
        }
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): JobFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      jobStatus: req.query.status as "all" | "released" | "failed" | "completed",
      queueFilter: req.query.groupFilter as "all" | "errors" | "slow",
      key: req.query.key as string,
    };
  }
}

export default JobWatcher;
