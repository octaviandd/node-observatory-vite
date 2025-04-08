/** @format */
import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface ScheduleFilters extends WatcherFilters {
  index: "instance" | "group";
  key?: string;
  status: "all" | "completed" | "failed";
  groupFilter: "all" | "errors" | "slow";
}

class ScheduleWatcher extends BaseWatcher {
  readonly type = "schedule";

  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  private getStatusSQL(type: string): string {
    return type === "all"
      ? "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.type')) = 'processJob')"
      : `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.type')) = 'processJob' AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${type}'`;
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

    const [relatedItems]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE request_id = ? AND job_id = ? AND schedule_id = ? AND type != ?",
      [item.request_id, item.job_id, item.schedule_id, this.type]
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
        OR: [{ uuid: id }],
        type: this.type
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
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
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [{ uuid: id }],
        type: this.type
      }
      });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
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
      where: { uuid: id, type: this.type },
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
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
  protected async handleRelatedDataSQL(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE request_id = ? AND job_id = ? AND schedule_id = ? AND type != ?",
      [requestId, jobId, scheduleId, this.type]
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
      where: { request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { not: this.type } }
    });
    return this.groupItemsByType(results);
  }


  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceKnex(filters: ScheduleFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "jobId") : "";

    const results = await this.storeConnection("observatory_entries")
      .select(
        this.storeConnection.raw("JSON_UNQUOTE(JSON_EXTRACT(content, '$.jobId')) as jobId"),
        this.storeConnection.raw("COUNT(*) as count"),
        this.storeConnection.raw("AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as avgDuration"),
        this.storeConnection.raw("SUM(CASE WHEN JSON_EXTRACT(content, '$.error') IS NOT NULL THEN 1 ELSE 0 END) as errorCount")
      )
      .whereRaw(`type = 'schedule' ${periodSQL} ${querySQL}`)
      .groupBy(this.storeConnection.raw("JSON_EXTRACT(content, '$.jobId')"))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .countDistinct(this.storeConnection.raw("JSON_UNQUOTE(JSON_EXTRACT(content, '$.jobId'))"))
      .whereRaw(`type = 'schedule' ${periodSQL} ${querySQL}`)
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: ScheduleFilters): Promise<any> {
    const { offset, limit, query, period, key, status } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "scheduleId") : "";
    const scheduleSql = key ? this.getEqualitySQL(key, "scheduleId") : "";
    const statusSql = status ? this.getStatusSQL(status) : "";

    const [results] = (await this.storeConnection.query(
      `SELECT * FROM observatory_entries WHERE type = 'schedule' ${statusSql} ${querySql} ${periodSql} ${scheduleSql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    )) as [any[]];

     const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) AS total FROM observatory_entries WHERE type = 'schedule' ${statusSql} ${querySql} ${periodSql} ${scheduleSql}`
    ) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: ScheduleFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { jobId: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "schedule",
            ...timeFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$jobId",
            jobId: { $first: "$jobId" },
            count: { $sum: 1 },
            avgDuration: { $avg: "$duration" },
            errorCount: {
              $sum: { $cond: [{ $ne: ["$error", null] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } },
        { $skip: offset },
        { $limit: limit }
      ])
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .distinct("jobId", {
        type: "schedule",
        ...timeFilter,
        ...queryFilter
      });

    return { results, count: count.length };
  }

  protected async getIndexTableDataByInstancePrisma(filters: ScheduleFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { jobId: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...timeFilter,
        ...queryFilter,
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,    
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...timeFilter,
        ...queryFilter, 
      }
    });

    return { results, count: count.count };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: ScheduleFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
      const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { jobId: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,  
        ...queryFilter,
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
    });   

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...timeFilter,
        ...queryFilter,
      }
    });   

    return { results, count: count.count };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: ScheduleFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { jobId: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({  
      where: {
        ...queryFilter,
        type: "schedule"
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
  protected async getIndexTableDataByGroupKnex(filters: ScheduleFilters): Promise<any> {
    const { query, offset, limit, key, period } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "jobId") : "";
    const keySQL = key ? this.getEqualitySQL(key, "jobId") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "schedule")
      .whereRaw(querySQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .whereRaw(periodSQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.scheduleId")) as scheduleId'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.jobId"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "schedule")
      .whereRaw(querySQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .whereRaw(periodSQL || "1=1")
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

  protected async getIndexTableDataByGroupSQL(filters: ScheduleFilters): Promise<any> {
    const { offset, limit, period, groupFilter, query } = filters;
    const timeSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "jobId") : "";

    let orderBySql =
      groupFilter === "all"
        ? "ORDER BY total DESC"
        : groupFilter === "errors"
        ? "ORDER BY failed DESC"
        : "ORDER BY longest DESC";

    const [results] = (await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.scheduleId')) AS scheduleId,
        COUNT(*) as total,
        GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.cronExpression'))) AS cronExpression,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed,
        CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
        CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
        CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
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
        ) AS p95
      FROM observatory_entries
      WHERE type = 'schedule' ${timeSql} ${querySql} AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.scheduleId'))
       ${orderBySql}
      LIMIT ${limit} OFFSET ${offset};`
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.scheduleId'))) as total
        FROM observatory_entries
          WHERE type = 'schedule' ${timeSql} ${querySql} AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed');`
    )) as [any];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupMongodb(filters: ScheduleFilters): Promise<any> {
    const { query, offset, limit, key, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { jobId: { $regex: query, $options: 'i' } } : {};
    const keyFilter = key ? { jobId: key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "schedule",
        ...timeFilter,
        ...queryFilter,
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
        type: "schedule",
        ...timeFilter,
        ...queryFilter,
        ...keyFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByGroupPrisma(filters: ScheduleFilters): Promise<any> {
    const { query, offset, limit, key, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { jobId: { contains: query } } : {};
    const keyFilter = key ? { jobId: key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...queryFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit,
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...timeFilter,  
        ...queryFilter,
        ...keyFilter,
      }
    });

    return { results, count: count.count };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: ScheduleFilters): Promise<any> {
    const { query, offset, limit, key, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { jobId: { contains: query } } : {};
    const keyFilter = key ? { jobId: key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,
        ...queryFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit,
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...timeFilter,  
        ...queryFilter,
        ...keyFilter,
      }
    });

    return { results, count: count.count };
  }

  protected async getIndexTableDataByGroupSequelize(filters: ScheduleFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { jobId: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {    
        ...queryFilter,
        type: "schedule"
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
  protected async getIndexGraphDataKnex(filters: ScheduleFilters): Promise<any> {
    const { period, key } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const keySQL = key ? this.getEqualitySQL(key, "jobId") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "schedule")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(keySQL || "1=1")
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
      .where("type", "schedule")
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
      count: aggregateResults.total,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: ScheduleFilters): Promise<any> {
    const { period, key } = filters;
    let timeSql = period ? this.getPeriodSQL(period) : "";
    let scheduleKeySql = key ? this.getEqualitySQL(key, "scheduleId") : "";

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries WHERE type = 'schedule' AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed') ${timeSql} ${scheduleKeySql}`
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
        WHERE type = 'schedule'  AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed') ${timeSql} ${scheduleKeySql}
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
        WHERE type = 'schedule' ${timeSql} ${scheduleKeySql} AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed')
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
    } = results.shift();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(countResult[0].total, true),
      indexCountOne: this.formatValue(aggregateResults.completed, true),
      indexCountTwo: this.formatValue(aggregateResults.failed, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  }

  protected async getIndexGraphDataMongodb(filters: ScheduleFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { jobId: key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "schedule",
            ...timeFilter,
            ...keyFilter
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

    const schedules = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "schedule",
        ...timeFilter,
        ...keyFilter
      })
      .toArray();

    const countFormattedData = this.countGraphData(schedules, period as string);
    const durationFormattedData = this.durationGraphData(schedules, period as string);
    const aggregateResults = results[0] || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: schedules,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: aggregateResults.shortest ? aggregateResults.shortest.toFixed(2) : 0,
      longest: aggregateResults.longest ? aggregateResults.longest.toFixed(2) : 0,
      average: aggregateResults.average ? aggregateResults.average.toFixed(2) : 0,
      p95: aggregateResults.p95 ? aggregateResults.p95.toFixed(2) : 0
    };
  }

  protected async getIndexGraphDataPrisma(filters: ScheduleFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { jobId: key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" }
    });

    const countFormattedData = this.countGraphData(results, period as string);  
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: results.length,
      shortest: parseFloat(results[0].duration || 0).toFixed(2),
      longest: parseFloat(results[results.length - 1].duration || 0).toFixed(2),
      // average: parseFloat(results.reduce((sum, entry) => sum + parseFloat(entry.duration || 0), 0) / results.length || 0).toFixed(2)
    };  
  }

  protected async getIndexGraphDataTypeorm(filters: ScheduleFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: { 
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const keyFilter = key ? { jobId: key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" }
    }); 

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: results.length,
      shortest: parseFloat(results[0].duration || 0).toFixed(2),
      longest: parseFloat(results[results.length - 1].duration || 0).toFixed(2),
      // average: parseFloat(results.reduce((sum, entry) => sum + parseFloat(entry.duration || 0), 0) / results.length || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSequelize(filters: ScheduleFilters): Promise<any> {
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

    data.forEach((schedule: any) => {
      const scheduleTime = new Date(schedule.created_at).getTime();
      const status = schedule.content.status;
      const intervalIndex = Math.floor(
        (scheduleTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          // @ts-ignore
          [status]: groupedData[intervalIndex][status] + 1,
        };
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): ScheduleFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      groupFilter: req.query.groupFilter as "all" | "errors" | "slow",
      index: req.query.index as "instance" | "group",
      key: req.query.key as string,
      status: req.query.status as "all" | "completed" | "failed",
    };
  }
}

export default ScheduleWatcher;
