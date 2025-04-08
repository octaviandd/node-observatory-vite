import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface LogFilters extends WatcherFilters {
  logType:
    | "All"
    | "Info"
    | "Warn"
    | "Error"
    | "Debug"
    | "Trace"
    | "Fatal"
    | "Complete"
    | "Log";
  key?: string;
  index: "instance" | "group";
}

class LogWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "log";

  /**
   * Constructor & Initialization
   * --------------------------------------------------------------------------
   */
  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  /**
   * Query Builder Methods
   * --------------------------------------------------------------------------
   */
  private getLogTypeSQL(logType: string): string {
    const types = logType.split(",");
    return types.map(type => `JSON_EXTRACT(content, '$.level') LIKE '%${type.toLowerCase()}%'`)
      .join(" OR ");
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
        request_id: { $eq: id },
        job_id: { $eq: id },
        schedule_id: { $eq: id },
        type: { $ne: this.type }
      })
      .toArray();

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.findUnique({
      where: { uuid: id, type: this.type },
    });

    const relatedItems = await this.storeConnection.observatory_entries.findMany({
      where: {
        request_id: id,
        job_id: id, 
        schedule_id: id,
        type: { not: this.type }
      }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.findUnique({
      where: { uuid: id, type: this.type },
    });

    const relatedItems = await this.storeConnection.observatory_entries.findMany({
      where: {
        request_id: id,
        job_id: id,
        schedule_id: id,
        type: { not: this.type }
      }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSequelize(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findUnique({
      where: { uuid: id, type: this.type },
    });

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
      where: {
        request_id: id,
        job_id: id,
        schedule_id: id,
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
    const results = await this.storeConnection("observatory_entries")
      .where({ batch_id: batchId })
      .whereNot({ type: this.type });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataMongodb(batchId: string): Promise<any> {
    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({ batch_id: batchId, type: { $ne: this.type } })
      .toArray();
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataPrisma(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.findMany({
      where: { batch_id: batchId, type: { not: this.type } },
      include: { relatedItems: true }
    });
    return this.groupItemsByType(results);
  } 

  protected async handleRelatedDataTypeorm(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.findMany({
      where: { batch_id: batchId, type: { not: this.type } },
      include: { relatedItems: true }
    }); 
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataSequelize(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: { batch_id: batchId, type: { not: this.type } },
      include: { relatedItems: true }
    });
    return this.groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */

  protected async getIndexTableDataByInstanceKnex(filters: LogFilters): Promise<any> {
    const { limit, offset, logType, query } = filters;
    const typeSQL = logType !== "All" ? `AND ${this.getLogTypeSQL(logType)}` : "";
    const querySQL = query ? this.getInclusionSQL(query, "message") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'log' ${typeSQL} ${querySQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'log' ${typeSQL} ${querySQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: LogFilters): Promise<any> {
    const { limit, offset, logType, query, key, period } = filters;
    const typeSql = logType.toLowerCase() === "all" ? "" : `AND ${this.getLogTypeSQL(logType)}`;
    const querySql = query ? this.getInclusionSQL(query, "message") : "";
    const messageSql = key ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) = '${key}'` : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'log' ${typeSql} ${querySql} ${messageSql} ${periodSql}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    ) as [any[]];

    const [countResults] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries
       WHERE type = 'log' ${typeSql} ${querySql} ${messageSql} ${periodSql}`
    ) as [any[]];

    console.log(results)

    return { results, count: this.formatValue(countResults[0].total, true) };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: LogFilters): Promise<any> {
    const { limit, offset, logType, query } = filters;
    const typeFilter = logType !== "All" ? { level: { $regex: logType, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "log",
        ...typeFilter,
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
        type: "log",
        ...typeFilter,
        ...queryFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: LogFilters): Promise<any> {
    const { limit, offset, logType, query } = filters;
    const typeFilter = logType !== "All" ? { level: { $regex: logType, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatory_entries.findMany({
      where: {
        ...typeFilter,
        ...queryFilter,
        type: "log"
      },
      orderBy: { created_at: "desc" },  
      skip: offset,
      take: limit
    });

    return { results, count: results.length };
  } 

  protected async getIndexTableDataByInstanceTypeorm(filters: LogFilters): Promise<any> {
    const { limit, offset, logType, query } = filters;
    const typeFilter = logType !== "All" ? { level: { $regex: logType, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {}; 

    const results = await this.storeConnection.observatory_entries.find({
      where: {
        ...typeFilter,
        ...queryFilter,
        type: "log"
      },  
      order: { created_at: "DESC" },
      skip: offset,
      take: limit
    });

    return { results, count: results.length };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: LogFilters): Promise<any> {
    const { limit, offset, logType, query } = filters;
    const typeFilter = logType !== "All" ? { level: { $regex: logType, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {}; 

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...typeFilter,
        ...queryFilter,
        type: "log"
      },  
      order: { created_at: "DESC" },
      offset,
      limit
    });

    return { results, count: results.length };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */

  protected async getIndexTableDataByGroupSQL(filters: LogFilters): Promise<any> {
    const { limit, offset, query, period } = filters;
    const querySql = query ? this.getInclusionSQL(query, "message") : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
      JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) as message,
      COUNT(*) as total,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'info' THEN 1 ELSE 0 END) as info,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'warn' THEN 1 ELSE 0 END) as warn,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'error' THEN 1 ELSE 0 END) as error,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'debug' THEN 1 ELSE 0 END) as debug,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'trace' THEN 1 ELSE 0 END) as trace,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'fatal' THEN 1 ELSE 0 END) as fatal,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'log' THEN 1 ELSE 0 END) as log
      FROM observatory_entries
      WHERE type = 'log' ${querySql} ${periodSql}
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.message'))
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}`
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.message'))) as total
       FROM observatory_entries
       WHERE type = 'log' ${querySql} ${periodSql}`
    )) as [any];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupKnex(filters: LogFilters): Promise<any> {
    const { limit, offset, query, period } = filters;
    const querySQL = query ? this.getInclusionSQL(query, "message") : "";
    const periodSQL = period ? this.getPeriodSQL(period) : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'log' ${querySQL || "1=1"} ${periodSQL || "1=1"}`)
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.message")) as message'),
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, "$.level")) LIKE "info" THEN 1 ELSE 0 END) as info'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, "$.level")) LIKE "warn" THEN 1 ELSE 0 END) as warn'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, "$.level")) LIKE "error" THEN 1 ELSE 0 END) as error'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, "$.level")) LIKE "debug" THEN 1 ELSE 0 END) as debug'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, "$.level")) LIKE "trace" THEN 1 ELSE 0 END) as trace'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, "$.level")) LIKE "fatal" THEN 1 ELSE 0 END) as fatal'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, "$.level")) LIKE "log" THEN 1 ELSE 0 END) as log')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.message"))'))
      .orderBy("total", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'log' ${querySQL || "1=1"} ${periodSQL || "1=1"}`)
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.message"))'));

    return {
      results,
      count: count[0]['count']
    };
  }

  protected async getIndexTableDataByGroupMongodb(filters: LogFilters): Promise<any> {
    const { limit, offset, query, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period as keyof typeof this.periods] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "content.message": { $regex: query, $options: 'i' } } : {};

    const pipeline = [
      {
        $match: {
          type: "log",
          ...timeFilter,
          ...queryFilter
        }
      },
      {
        $group: {
          _id: "$content.message",
          message: { $first: "$content.message" },
          total: { $sum: 1 },
          info: { $sum: { $cond: [{ $eq: ["$content.level", "info"] }, 1, 0] } },
          warn: { $sum: { $cond: [{ $eq: ["$content.level", "warn"] }, 1, 0] } },
          error: { $sum: { $cond: [{ $eq: ["$content.level", "error"] }, 1, 0] } },
          debug: { $sum: { $cond: [{ $eq: ["$content.level", "debug"] }, 1, 0] } },
          trace: { $sum: { $cond: [{ $eq: ["$content.level", "trace"] }, 1, 0] } },
          fatal: { $sum: { $cond: [{ $eq: ["$content.level", "fatal"] }, 1, 0] } },
          log: { $sum: { $cond: [{ $eq: ["$content.level", "log"] }, 1, 0] } }
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
    ];

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate(pipeline)
      .toArray();

    // Get total count of distinct messages
    const countPipeline = [
      {
        $match: {
          type: "log",
          ...timeFilter,
          ...queryFilter
        }
      },
      {
        $group: {
          _id: "$content.message"
        }
      },
      {
        $count: "total"
      }
    ];

    const countResult = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate(countPipeline)
      .toArray();

    return { 
      results, 
      count: countResult.length > 0 ? countResult[0].total : 0 
    };
  }

  protected async getIndexTableDataByGroupPrisma(filters: LogFilters): Promise<any> {
    const { limit, offset, query, period } = filters;
    const where: any = { type: "log" };
    
    if (period) {
      const periodTime = this.periods[period as keyof typeof this.periods];
      const startDate = new Date(Date.now() - periodTime * 60 * 1000);
      where.created_at = { gte: startDate };
    }
    
    if (query) {
      where.content = { path: ['message'], string_contains: query };
    }

    // First get all matching log entries to process in memory (since Prisma doesn't support complex aggregations natively)
    const allLogs = await this.storeConnection.observatory_entries.findMany({
      where,
      select: {
        content: true
      }
    });

    // Process the data in memory to match SQL output format
    const messageGroups: Record<string, any> = {};
    
    allLogs.forEach((log: any) => {
      const message = log.content.message;
      const level = log.content.level;
      
      if (!messageGroups[message]) {
        messageGroups[message] = {
          message,
          total: 0,
          info: 0,
          warn: 0,
          error: 0,
          debug: 0,
          trace: 0,
          fatal: 0,
          log: 0
        };
      }
      
      messageGroups[message].total++;
      if (level && messageGroups[message][level] !== undefined) {
        messageGroups[message][level]++;
      }
    });
    
    // Convert to array, sort, and apply pagination
    const results = Object.values(messageGroups)
      .sort((a, b) => b.total - a.total)
      .slice(offset, offset + limit);
    
    return { 
      results, 
      count: Object.keys(messageGroups).length 
    };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: LogFilters): Promise<any> {
    const { limit, offset, query, period } = filters;
    
    // For TypeORM, we'll need to construct a query that works similar to the SQL version
    // First, let's create the where condition
    let whereCondition = "type = 'log'";
    const params: any[] = [];
    
    if (query) {
      whereCondition += " AND JSON_EXTRACT(content, '$.message') LIKE ?";
      params.push(`%${query}%`);
    }
    
    if (period) {
      const periodTime = this.periods[period as keyof typeof this.periods];
      const startDate = new Date(Date.now() - periodTime * 60 * 1000);
      whereCondition += " AND created_at >= ?";
      params.push(startDate);
    }

    // Execute a raw query to get the grouped results
    const rawQuery = `
      SELECT
        JSON_EXTRACT(content, '$.message') as message,
        COUNT(*) as total,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'info' THEN 1 ELSE 0 END) as info,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'warn' THEN 1 ELSE 0 END) as warn,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'error' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'debug' THEN 1 ELSE 0 END) as debug,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'trace' THEN 1 ELSE 0 END) as trace,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'fatal' THEN 1 ELSE 0 END) as fatal,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'log' THEN 1 ELSE 0 END) as log
      FROM observatory_entries
      WHERE ${whereCondition}
      GROUP BY JSON_EXTRACT(content, '$.message')
      ORDER BY total DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const results = await this.storeConnection.query(rawQuery, params);
    
    // Count query for total distinct messages
    const countQuery = `
      SELECT COUNT(DISTINCT JSON_EXTRACT(content, '$.message')) as total
      FROM observatory_entries
      WHERE ${whereCondition}
    `;
    
    const countResult = await this.storeConnection.query(countQuery, params.slice(0, -2));
    
    return { 
      results, 
      count: countResult[0].total 
    };
  }

  protected async getIndexTableDataByGroupSequelize(filters: LogFilters): Promise<any> {
    const { limit, offset, query, period } = filters;
    
    // Create where condition
    const where: any = { type: "log" };
    
    if (period) {
      const periodTime = this.periods[period as keyof typeof this.periods];
      const startDate = new Date(Date.now() - periodTime * 60 * 1000);
      where.created_at = { [Symbol.for('gte')]: startDate };
    }
    
    // Get all logs that match filter to process in memory
    const queryOptions: any = { where };
    if (query) {
      queryOptions.where['$content.message$'] = { [Symbol.for('like')]: `%${query}%` };
    }
    
    // Execute raw query to get the data in the correct format
    const rawQuery = `
      SELECT
        JSON_EXTRACT(content, '$.message') as message,
        COUNT(*) as total,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'info' THEN 1 ELSE 0 END) as info,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'warn' THEN 1 ELSE 0 END) as warn,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'error' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'debug' THEN 1 ELSE 0 END) as debug,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'trace' THEN 1 ELSE 0 END) as trace,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'fatal' THEN 1 ELSE 0 END) as fatal,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.level') LIKE 'log' THEN 1 ELSE 0 END) as log
      FROM observatory_entries
      WHERE type = 'log'
      ${query ? `AND JSON_EXTRACT(content, '$.message') LIKE '%${query}%'` : ''}
      ${period ? `AND created_at >= '${new Date(Date.now() - this.periods[period as keyof typeof this.periods] * 60 * 1000).toISOString()}'` : ''}
      GROUP BY JSON_EXTRACT(content, '$.message')
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const results = await this.storeConnection.query(rawQuery, {
      type: this.storeConnection.QueryTypes.SELECT
    });
    
    // Count query for total distinct messages
    const countQuery = `
      SELECT COUNT(DISTINCT JSON_EXTRACT(content, '$.message')) as total
      FROM observatory_entries
      WHERE type = 'log'
      ${query ? `AND JSON_EXTRACT(content, '$.message') LIKE '%${query}%'` : ''}
      ${period ? `AND created_at >= '${new Date(Date.now() - this.periods[period as keyof typeof this.periods] * 60 * 1000).toISOString()}'` : ''}
    `;
    
    const countResult = await this.storeConnection.query(countQuery, {
      type: this.storeConnection.QueryTypes.SELECT
    });
    
    return { 
      results, 
      count: countResult[0].total 
    };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataKnex(filters: LogFilters): Promise<any> {
    const { period, key } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const messageSQL = key ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) = '${key}'` : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'log' ${periodSQL || "1=1"} ${messageSQL || "1=1"}`)
      .count('* as total')
      .first();

    // Get detailed data
    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'log' ${periodSQL || "1=1"} ${messageSQL || "1=1"}`)
      .select("created_at", "content", "uuid", "type", "request_id", "job_id", "schedule_id")
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      count: aggregateResults?.total || 0,
    };
  }

  protected async getIndexGraphDataSQL(filters: LogFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const messageSql = key ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) = '${key}'` : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'info' THEN 1 ELSE 0 END) as info,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'warn' THEN 1 ELSE 0 END) as warn,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'error' THEN 1 ELSE 0 END) as error,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'debug' THEN 1 ELSE 0 END) as debug,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'trace' THEN 1 ELSE 0 END) as trace,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'fatal' THEN 1 ELSE 0 END) as fatal,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'log' THEN 1 ELSE 0 END) as log,
          NULL as created_at,
          NULL as content,
          NULL as uuid,
          NULL as type,
          NULL as request_id,
          NULL as job_id,
          NULL as schedule_id,
          'aggregate' as row_type
        FROM observatory_entries
        WHERE type = 'log' ${periodSql} ${messageSql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as info,
          NULL as warn,
          NULL as error,
          NULL as debug,
          NULL as trace,
          NULL as fatal,
          NULL as log,
          created_at,
          content,
          uuid,
          type,
          request_id,
          job_id,
          schedule_id,
          'row' as row_type
        FROM observatory_entries
        WHERE type = 'log' ${periodSql} ${messageSql}
        ORDER BY created_at DESC
      );`
    );

    const aggregateResults : {
      total: number;
      info: number;
      warn: number;
      error: number;
      debug: number;
      trace: number;
      fatal: number;
      log: number;
    } = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.info, true),
      indexCountTwo: this.formatValue(aggregateResults.warn, true),
      indexCountThree: this.formatValue(aggregateResults.error, true),
      indexCountFive: this.formatValue(aggregateResults.debug, true),
      indexCountSix: this.formatValue(aggregateResults.trace, true),
      indexCountSeven: this.formatValue(aggregateResults.fatal, true),
      indexCountEight: this.formatValue(aggregateResults.log, true),
    };
  }

  protected async getIndexGraphDataMongodb(filters: LogFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter: any = {};
    
    if (period) {
      timeFilter.created_at = {
        $gte: new Date(Date.now() - this.periods[period as keyof typeof this.periods] * 60 * 1000)
      };
    }
    
    const messageFilter = key ? { "content.message": key } : {};
    
    // Get aggregate count
    const countResult = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .countDocuments({
        type: "log",
        ...timeFilter,
        ...messageFilter
      });
    
    // Get detailed data
    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "log",
        ...timeFilter,
        ...messageFilter
      })
      .sort({ created_at: -1 })
      .toArray();
    
    const countFormattedData = this.countGraphData(results, period as string);
    
    return {
      results,
      countFormattedData,
      count: countResult,
    };
  }

  protected async getIndexGraphDataPrisma(filters: LogFilters): Promise<any> {
    const { period, key } = filters;
    const where: any = { type: "log" };
    
    if (period) {
      const periodTime = this.periods[period as keyof typeof this.periods];
      const startDate = new Date(Date.now() - periodTime * 60 * 1000);
      where.created_at = { gte: startDate };
    }
    
    if (key) {
      where.content = { path: ['message'], equals: key };
    }
    
    // Get aggregate count
    const count = await this.storeConnection.observatory_entries.count({
      where
    });
    
    // Get detailed data
    const results = await this.storeConnection.observatory_entries.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        created_at: true,
        content: true,
        uuid: true,
        type: true,
        request_id: true,
        job_id: true,
        schedule_id: true
      }
    });
    
    const countFormattedData = this.countGraphData(results, period as string);
    
    return {
      results,
      countFormattedData,
      count,
    };
  }

  protected async getIndexGraphDataTypeorm(filters: LogFilters): Promise<any> {
    const { period, key } = filters;
    
    // Build where conditions
    let whereCondition = "type = 'log'";
    const params: any[] = [];
    
    if (key) {
      whereCondition += " AND JSON_EXTRACT(content, '$.message') = ?";
      params.push(key);
    }
    
    if (period) {
      const periodTime = this.periods[period as keyof typeof this.periods];
      const startDate = new Date(Date.now() - periodTime * 60 * 1000);
      whereCondition += " AND created_at >= ?";
      params.push(startDate);
    }
    
    // Get aggregate count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM observatory_entries
      WHERE ${whereCondition}
    `;
    
    const countResult = await this.storeConnection.query(countQuery, params);
    
    // Get detailed data
    const detailQuery = `
      SELECT created_at, content, uuid, type, request_id, job_id, schedule_id
      FROM observatory_entries
      WHERE ${whereCondition}
      ORDER BY created_at DESC
    `;
    
    const results = await this.storeConnection.query(detailQuery, params);
    
    const countFormattedData = this.countGraphData(results, period as string);
    
    return {
      results,
      countFormattedData,
      count: countResult[0].total,
    };
  }

  protected async getIndexGraphDataSequelize(filters: LogFilters): Promise<any> {
    const { period, key } = filters;
    
    // Prepare the where clause
    let whereClause = "type = 'log'";
    if (key) {
      whereClause += ` AND JSON_EXTRACT(content, '$.message') = '${key}'`;
    }
    
    if (period) {
      const periodTime = this.periods[period as keyof typeof this.periods];
      const startDate = new Date(Date.now() - periodTime * 60 * 1000).toISOString();
      whereClause += ` AND created_at >= '${startDate}'`;
    }
    
    // Get aggregate count
    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries WHERE ${whereClause}`,
      { type: this.storeConnection.QueryTypes.SELECT }
    );
    
    // Get detailed data
    const results = await this.storeConnection.query(
      `SELECT created_at, content, uuid, type, request_id, job_id, schedule_id 
       FROM observatory_entries 
       WHERE ${whereClause} 
       ORDER BY created_at DESC`,
      { type: this.storeConnection.QueryTypes.SELECT }
    );
    
    const countFormattedData = this.countGraphData(results, period as string);
    
    return {
      results,
      countFormattedData,
      count: countResult.total,
    };
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
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
      trace: 0,
      fatal: 0,
      log: 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((log: any) => {
      const logTime = new Date(log.created_at).getTime();
      const level = log.content.level;

      // Calculate which interval the log falls into
      const intervalIndex = Math.floor(
        (logTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          //@ts-ignore
          [level]: groupedData[intervalIndex][level] + 1,
        };
      }
    });

    return groupedData;
  }

  protected durationGraphData(data: any, period: string) {
    // Logs don't have duration data
    return [];
  }

  protected extractFiltersFromRequest(req: Request): LogFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      logType: req.query.status as LogFilters["logType"],
      index: req.query.index as "instance" | "group",
      key: req.query.key as string
    };
  }
}

export default LogWatcher;
