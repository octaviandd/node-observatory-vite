/** @format */

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface ExceptionFilters extends WatcherFilters {
  type: "all" | "unhandled" | "uncaught";
  key?: string;
  query?: string;
}

class ExceptionWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "exception";

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
          { batch_id: id, type: { $ne: this.type } }
        ]
      })
      .toArray();

    return this.groupItemsByType(results);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatory_entries.findMany({
      where: {
        uuid: id,
        type: this.type
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatory_entries.findMany({
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

  protected async handleViewTypeorm(id: string): Promise<any> {
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
    const results = await this.storeConnection.observatory_entries.findMany({
      where: {
        request_id: requestId,
        job_id: jobId,
        schedule_id: scheduleId,
        type: { not: this.type }
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
        type: { not: this.type }
      }
    });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataSequelize(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        request_id: requestId,
        job_id: jobId,
        schedule_id: scheduleId,
        type: { not: this.type }
      }
    });
    return this.groupItemsByType(results);
  }


   /**
   * Table Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataKnex(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeSQL = type ? this.getInclusionSQL(type, "type") : "";
    const querySQL = query ? this.getInclusionSQL(query, "message") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'exception' ${typeSQL} ${querySQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'exception' ${typeSQL} ${querySQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataSQL(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeSQL = type ? this.getInclusionSQL(type, "type") : "";
    const querySQL = query ? this.getInclusionSQL(query, "message") : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries 
       WHERE type = 'exception' ${typeSQL} ${querySQL} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries 
       WHERE type = 'exception' ${typeSQL} ${querySQL}`
    );

    return { results, count: countResult[0].total };
  }

  protected async getIndexTableDataMongodb(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "exception",
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
        type: "exception",
        ...typeFilter,
        ...queryFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataPrisma(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatory_entries.findMany({ 
      where: {
        ...typeFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit
    });

    const count = await this.storeConnection.observatory_entries.count({
      where: {
        ...typeFilter,  
        ...queryFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataTypeorm(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.find({  
      where: {
        ...typeFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...typeFilter,  
        ...queryFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataSequelize(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.find({  
      where: {
        ...typeFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...typeFilter,  
        ...queryFilter
      }
    });

    return { results, count };
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */

  protected async getIndexTableDataByInstanceKnex(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeSQL = type ? this.getInclusionSQL(type, "type") : "";
    const querySQL = query ? this.getInclusionSQL(query, "message") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'exception' ${typeSQL} ${querySQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'exception' ${typeSQL} ${querySQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query, key } = filters;
    const typeSQL = type !== 'all' ? this.getInclusionSQL(type, "type") : "";
    const querySQL = query ? this.getInclusionSQL(query, "message") : "";
    const keySQL = key ? this.getEqualitySQL(key, "message") : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'exception' ${typeSQL} ${querySQL} ${keySQL}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries
       WHERE type = 'exception' ${typeSQL} ${querySQL} ${keySQL}`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "exception",
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
        type: "exception",
        ...typeFilter,
        ...queryFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatory_entries.findMany({
      where: {
        ...typeFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit
    });

    const count = await this.storeConnection.observatory_entries.count({
      where: {
        ...typeFilter,    
        ...queryFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.find({  
      where: {
        ...typeFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,  
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...typeFilter,  
        ...queryFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: ExceptionFilters): Promise<any> {
    const { limit, offset, type, query } = filters;
    const typeFilter = type ? { type: { $regex: type, $options: 'i' } } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.find({  
      where: {
        ...typeFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,  
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...typeFilter,    
        ...queryFilter
      }
    });

    return { results, count };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupKnex(filters: ExceptionFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "message") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "exception")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.message")) as message'),
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.type")) as type'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(created_at) as first_seen'),
        this.storeConnection.raw('MAX(created_at) as last_seen'),
        this.storeConnection.raw('GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, "$.file"))) as files'),
        this.storeConnection.raw('GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, "$.line"))) as lines')
      )
      .groupBy(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.message"))'),
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.type"))')
      )
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "exception")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .countDistinct([
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.message"))'),
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.type"))')
      ]);

    return {
      results: results.map((row: any) => ({
        ...row,
        files: row.files?.split(',') || [],
        lines: row.lines?.split(',').map(Number) || []
      })),
      count: count[0]['count']
    };
  }

  protected async getIndexTableDataByGroupMongodb(filters: ExceptionFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "exception",
            ...timeFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$content.type",
            exception_type: { $first: "$content.type" },
            total: { $sum: 1 },
            first_seen: { $min: "$created_at" },
            last_seen: { $max: "$created_at" }
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
      .distinct("content.type", {
        type: "exception",
        ...timeFilter,
        ...queryFilter
      });

    return { results, count: count.length };
  }

  protected async getIndexTableDataByGroupSQL(filters: ExceptionFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "message") : "";

    const [results] = await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) as header,
        COUNT(*) as total,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM observatory_entries
      WHERE type = 'exception' ${periodSQL} ${querySQL}
      GROUP BY header
      ORDER BY total DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
     const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.message'))) as total FROM observatory_entries WHERE type = 'exception' ${periodSQL} ${querySQL}`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupPrisma(filters: ExceptionFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatory_entries.groupBy({
      by: ["content.type"],
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

  protected async getIndexTableDataByGroupTypeorm(filters: ExceptionFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["content.type"],
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

  protected async getIndexTableDataByGroupSequelize(filters: ExceptionFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { message: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["content.type"],
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

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataKnex(filters: ExceptionFilters): Promise<any> {
    const { period, type } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const typeSQL = type ? this.getEqualitySQL(type, "type") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "exception")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(typeSQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, "$.message"))) as unique_messages'),
        this.storeConnection.raw('COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, "$.type"))) as unique_types'),
        this.storeConnection.raw('COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, "$.file"))) as unique_files'),
        this.storeConnection.raw(`
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'type', JSON_UNQUOTE(JSON_EXTRACT(content, "$.type")),
              'count', COUNT(*)
            )
          ) as type_distribution
        `)
      )
      .first();

    // Get detailed data
    const results = await this.storeConnection("observatory_entries")
      .where("type", "exception")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(typeSQL || "1=1")
      .select("created_at", "content")
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      count: aggregateResults.total,
      unique_messages: aggregateResults.unique_messages,
      unique_types: aggregateResults.unique_types,
      unique_files: aggregateResults.unique_files,
      type_distribution: JSON.parse(aggregateResults.type_distribution || '[]')
    };
  }

  protected async getIndexGraphDataSQL(filters: ExceptionFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getEqualitySQL(key, "message") : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.type') = 'unhandledRejection' THEN 1 ELSE 0 END) as unhandledRejection,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.type') = 'uncaughtException' THEN 1 ELSE 0 END) as uncaughtException,
          NULL as created_at,
          NULL as content,
          'aggregate' as type
        FROM observatory_entries
        WHERE type = 'exception' ${periodSql} ${keySql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as unhandledRejection,
          NULL as uncaughtException,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'exception' ${periodSql} ${keySql}
        ORDER BY created_at DESC
      );`
    ) as any[];

    const aggregateResults : {
      total: number;
      unhandledRejection: string | null;
      uncaughtException: string | null;
    } = results.shift() as any;

    const countFormattedData = this.countGraphData(results, period as string);

    return {
      countFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.unhandledRejection, true),
      indexCountTwo: this.formatValue(aggregateResults.uncaughtException, true),
    };
  }

  protected async getIndexGraphDataMongodb(filters: ExceptionFilters): Promise<any> {
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
            type: "exception",
            ...timeFilter
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const exceptions = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "exception",
        ...timeFilter
      })
      .toArray();

    const countFormattedData = this.countGraphData(exceptions, period as string);
    const aggregateResults = results[0] || { total: 0 };

    return {
      results: exceptions,
      countFormattedData,
      count: aggregateResults.total
    };
  }

  protected async getIndexGraphDataPrisma(filters: ExceptionFilters): Promise<any> {
    const { period } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};

    const results = await this.storeConnection.observatory_entries.groupBy({
      by: ["content.type"],
      _count: true,
      _min: { created_at: true }, 
      _max: { created_at: true }
    }, {
      where: {
        ...periodFilter
      },
      orderBy: { created_at: "desc" }
    });   

    const exceptions = await this.storeConnection.observatory_entries.findMany({
      where: {
        ...periodFilter
      },
      orderBy: { created_at: "desc" }
    });   

    const countFormattedData = this.countGraphData(exceptions, period as string);
    const aggregateResults = results[0] || { total: 0 };

    return {
      results: exceptions,
      countFormattedData,
      count: aggregateResults.total
    };
  }

  protected async getIndexGraphDataTypeorm(filters: ExceptionFilters): Promise<any> {
    const { period } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {}; 

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["content.type"],
      _count: true,
      _min: { created_at: true },
      _max: { created_at: true }
    }, {  
      where: {
        ...periodFilter
      },
      orderBy: { created_at: "desc" }
    });

    const exceptions = await this.storeConnection.observatoryEntry.findMany({ 
      where: {
        ...periodFilter
      },
      orderBy: { created_at: "desc" }
    });

    const countFormattedData = this.countGraphData(exceptions, period as string); 
    const aggregateResults = results[0] || { total: 0 };

    return {
      results: exceptions,
      countFormattedData,
      count: aggregateResults.total
    };
  }

  protected async getIndexGraphDataSequelize(filters: ExceptionFilters): Promise<any> {
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
    const totalDuration = this.periods[period as keyof typeof this.periods]; // Total duration in minutes
    const intervalDuration = totalDuration / 120; // Duration of each bar in minutes

    const now = new Date().getTime(); // Current timestamp in ms
    const startDate = now - totalDuration * 60 * 1000; // Start time in ms

    const groupedData = Array.from({ length: 120 }, (_, index) => ({
      unhandledRejection: 0,
      uncaughtException: 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((exception: any) => {
      const exceptionTime = new Date(exception.created_at).getTime();
      const type = exception.content.type;

      const intervalIndex = Math.floor(
        (exceptionTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          // @ts-ignore
          [type]: groupedData[intervalIndex][type] + 1,
        };
      }
    });

    return groupedData;
  }

  protected durationGraphData(data: any, period: string) {
    // Exceptions don't have duration data
    return [];
  }

  protected extractFiltersFromRequest(req: Request): ExceptionFilters {
    return {
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      type: req.query.status as "all" | "unhandled" | "uncaught",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      key: req.query.key as string,
    };
  }
}

export default ExceptionWatcher;
