/** @format */

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface MailFilters extends WatcherFilters {
  index: "instance" | "group";
  status: "completed" | "failed" | "all";
  key?: string;
}

class MailWatcher extends BaseWatcher {
  readonly type = "mail";

  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  private getStatusSQL(status: string): string {
    return status === "all" 
      ? "" 
      : `AND JSON_EXTRACT(content, '$.status') = '${status === "completed" ? "completed" : "failed"}'`;
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
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [{ uuid: id, type: this.type }]
      }
    });

    const relatedItems = await this.storeConnection.observatoryEntry.findMany({
      where: {
        request_id: { equals: id },
        job_id: { equals: id },
        schedule_id: { equals: id },
        type: { not: this.type }
      }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        OR: [{ uuid: id, type: this.type }]
      }
    });

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: {
        request_id: { equals: id },
        job_id: { equals: id },
        schedule_id: { equals: id },
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

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: {
        request_id: { equals: id },
        job_id: { equals: id },
        schedule_id: { equals: id },
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
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: { request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { not: this.type } }
    });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataTypeorm(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: { request_id: requestId, job_id: jobId, schedule_id: scheduleId, type: { not: this.type } }
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

  protected async getIndexTableDataByInstanceKnex(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusSQL = status ? this.getStatusSQL(status) : "";
    const mailToSQL = key ? this.getEqualitySQL(key, "to") : "";
    const querySQL = query ? this.getInclusionSQL(query, "subject") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'mail' ${statusSQL} ${mailToSQL} ${querySQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'mail' ${statusSQL} ${mailToSQL} ${querySQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusSql = status ? this.getStatusSQL(status) : "";
    const mailToSql = key ? this.getInclusionSQL(key, "to") : "";
    const querySql = query ? this.getInclusionSQL(query, "subject") : "";


    console.log(filters)

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'mail' ${statusSql} ${mailToSql} ${querySql}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) AS total FROM observatory_entries
       WHERE type = 'mail' ${statusSql} ${mailToSql} ${querySql}`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusFilter = status !== "all" ? { 
      event: status === "completed" ? "completed" : "failed" 
    } : {};
    const mailToFilter = key ? { to: key } : {};
    const queryFilter = query ? { subject: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "mail",
        ...statusFilter, 
        ...mailToFilter,
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
        type: "mail",
        ...statusFilter,
        ...mailToFilter,
        ...queryFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusFilter = status !== "all" ? { 
      event: status === "completed" ? "completed" : "failed" 
    } : {};
    const mailToFilter = key ? { to: key } : {};  
    const queryFilter = query ? { subject: { contains: query, mode: "insensitive" } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...statusFilter,
        ...mailToFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    }); 

    return this.groupItemsByType(results);
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusFilter = status !== "all" ? { 
      event: status === "completed" ? "completed" : "failed" 
    } : {};
    const mailToFilter = key ? { to: key } : {};
    const queryFilter = query ? { subject: { contains: query, mode: "insensitive" } } : {}; 

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...statusFilter,
        ...mailToFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    return this.groupItemsByType(results);  
  }

  protected async getIndexTableDataByInstanceSequelize(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusFilter = status !== "all" ? { 
      event: status === "completed" ? "completed" : "failed" 
    } : {};
    const mailToFilter = key ? { to: key } : {};  
    const queryFilter = query ? { subject: { contains: query, mode: "insensitive" } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...statusFilter,
        ...mailToFilter,
        ...queryFilter
      },
      orderBy: { created_at: "desc" },
      offset,
      limit
    }); 

    return this.groupItemsByType(results);
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(filters: MailFilters): Promise<any> {
   const { offset, limit, period, query, status } = filters;
    let periodSql = period ? this.getPeriodSQL(period) : "";
    let querySql = query ? this.getInclusionSQL(query, "subject") : "";

    const [results] = await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.to')) as mail_to,
        COUNT(*) as total,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as success_count,
        CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
        CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
        CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
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
        ) AS p95
       FROM observatory_entries
       WHERE type = 'mail' ${periodSql} ${querySql}
       GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.to'))
       ORDER BY total DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_EXTRACT(content, '$.to')) as total
       FROM observatory_entries
       WHERE type = 'mail' ${periodSql} ${querySql}`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupKnex(filters: MailFilters): Promise<any> {
    const { offset, limit, query, period, status, key } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "subject") : "";
    let statusSQL = status ? this.getStatusSQL(status) : "";
    let keySQL = key ? this.getEqualitySQL(key, "to") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "mail")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.to")) as to'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.event") = "SUCCESS" THEN 1 ELSE 0 END) as success'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.event") = "FAILED" THEN 1 ELSE 0 END) as failed')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.to"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "mail")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.to"))'));

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

  protected async getIndexTableDataByGroupMongodb(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const mailToFilter = key ? { to: key } : {};
    const queryFilter = query ? { subject: { $regex: query, $options: 'i' } } : {};
    const statusFilter = status !== "all" ? { 
      event: status === "completed" ? "completed" : "failed" 
    } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "mail",
            ...statusFilter,
            ...mailToFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$event",
            total: { $sum: 1 }
          }
        },
        {
          $sort: {
            total: -1
          }
        },
        {
          $skip: offset
        },
        {
          $limit: limit
        }
      ])
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .countDocuments({
        type: "mail",
        ...statusFilter,
        ...mailToFilter,
        ...queryFilter
      });

    return { results, count };  
  }

  protected async getIndexTableDataByGroupPrisma(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusFilter = status !== "all" ? { 
      event: status === "completed" ? "completed" : "failed" 
    } : {};
    const mailToFilter = key ? { to: key } : {};
    const queryFilter = query ? { subject: { contains: query, mode: "insensitive" } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["event"],
      _count: true
    }, {
      where: {
        ...statusFilter,
        ...mailToFilter,
        ...queryFilter
      },
      orderBy: { event: "desc" },
      skip: offset,
      take: limit
    });

    return { results, count: results.length };
  } 

  protected async getIndexTableDataByGroupTypeorm(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusFilter = status !== "all" ? { 
        event: status === "completed" ? "completed" : "failed" 
    } : {}; 
    const mailToFilter = key ? { to: key } : {};
    const queryFilter = query ? { subject: { contains: query, mode: "insensitive" } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["event"],
      _count: true
    }, {
      where: {
        ...statusFilter,
        ...mailToFilter,
        ...queryFilter
      },
      orderBy: { event: "desc" },
      skip: offset,
      take: limit
    });

    return { results, count: results.length };
  }

  protected async getIndexTableDataByGroupSequelize(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusFilter = status !== "all" ? { 
      event: status === "completed" ? "completed" : "failed" 
    } : {};
    const keyFilter = key ? { to: key } : {};  
    const queryFilter = query ? { subject: { contains: query, mode: "insensitive" } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy("event", {
      by: ["event"],
      _count: true,
      _sum: {
        duration: true
      }
    }, {
      where: {
        ...statusFilter,
          ...keyFilter,
        ...queryFilter
      },
      orderBy: { event: "desc" },
      offset,
      limit
    }); 
    
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataKnex(filters: MailFilters): Promise<any> {
    const { period, key, status } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const keySQL = key ? this.getEqualitySQL(key, "to") : "";
    const statusSQL = status ? this.getStatusSQL(status) : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "mail")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.event") = "SUCCESS" THEN 1 ELSE 0 END) as success'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.event") = "FAILED" THEN 1 ELSE 0 END) as failed'),
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
      .where("type", "mail")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(keySQL || "1=1")
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
      success: aggregateResults.success,
      failed: aggregateResults.failed,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: MailFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getEqualitySQL(key, "to") : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as shortest,
          MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as longest,
          AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as average,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.status') = 'completed' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.status') = 'failed' THEN 1 ELSE 0 END) as failed,
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
        WHERE type = 'mail' ${periodSql} ${keySql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          NULL as success,
          NULL as failed,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'mail' ${periodSql} ${keySql}
        ORDER BY created_at DESC
      );`
    );

    const aggregateResults : {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      success: string | null;
      failed: string | null;
      p95: string | null;
    } = results.shift();


    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.success, true),
      indexCountTwo: this.formatValue(aggregateResults.failed, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  }

  protected async getIndexGraphDataMongodb(filters: MailFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { to: key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "mail",
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

    const mails = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "mail",
        ...timeFilter,
        ...keyFilter
      })
      .toArray();

    const countFormattedData = this.countGraphData(mails, period as string);
    const durationFormattedData = this.durationGraphData(mails, period as string);
    const aggregateResults = results[0] || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: mails,
      countFormattedData,
      durationFormattedData,
      ...aggregateResults
    };
  }

  protected async getIndexGraphDataPrisma(filters: MailFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { to: key } : {};

    const results = await this.storeConnection.$queryRaw`
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.event')) as event,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM observatory_entries
      WHERE type = 'mail' ${timeFilter} ${keyFilter}
    `;  

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataTypeorm(filters: MailFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { to: key } : {};    

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["event"],
      _count: true
    }, {
      where: {
        ...timeFilter,
        ...keyFilter
      },
      orderBy: { event: "desc" }
    });

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataSequelize(filters: MailFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const keyFilter = key ? { to: key } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy("event", {
      by: ["event"],
      _count: true,
      _sum: {
        duration: true
      }
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

    data.forEach((mail: any) => {
      const mailTime = new Date(mail.created_at).getTime();
      const status = mail.content.status;
      const intervalIndex = Math.floor(
        (mailTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        if (status === 'completed' || status === 'failed') {
          groupedData[intervalIndex][status as 'completed' | 'failed']++;
        }
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): MailFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      status: req.query.status as "completed" | "failed" | "all",
      key: req.query.key as string,
    };
  }
}

export default MailWatcher;
