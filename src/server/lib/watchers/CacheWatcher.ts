/** @format */

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface CacheFilters extends WatcherFilters {
  index: "instance" | "group";
  cacheType: "all" | "misses" | "hits" | "writes";
  key?: string;
}

class CacheWatcher extends BaseWatcher {
  readonly type = "cache";

  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  private getStatusSQL(type: string) {
    if (type === "misses") {
      return "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0)";
    }
    if (type === "hits") {
      return "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0)";
    }
    if (type === "writes") {
      return "AND (JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0)";
    }
  }

  /**
   * View Methods
   * --------------------------------------------------------------------------
   */
  protected async handleViewKnex(id: string): Promise<any> {
    const results = await this.storeConnection("observatory_entries")
      .where("uuid", id)

    const item = results[0];

    const relatedItems = await this.storeConnection("observatory_entries")
      .where("request_id", item.request_id)
      .where("job_id", item.job_id)
      .where("schedule_id", item.schedule_id)
      .whereNot("type", "cache");

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
      .db('observatory')
      .collection("observatory_entries")
      .find({
        $or: [{ uuid: id }]
      })
      .toArray();

    const item = results[0];

    const relatedItems = await this.storeConnection
      .db('observatory')
      .collection("observatory_entries")
      .find({
        $or: [
          { request_id: item.request_id },
          { job_id: item.job_id },
          { schedule_id: item.schedule_id }
        ],
        type: { $ne: "cache" }
      })
      .toArray();

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        uuid: id,
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: {
        batch_id: item.batch_id,
        type: { $ne: "cache" }
      }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        uuid: id,
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: {
        request_id: item.request_id,
        job_id: item.job_id,
        schedule_id: item.schedule_id,
        type: { $ne: "cache" }
      }
    });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSequelize(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        uuid: id,
      }
    });

    const item = results[0];

    const relatedItems = await this.storeConnection.observatoryEntry.find({
      where: {
        request_id: item.request_id,
        job_id: item.job_id,
        schedule_id: item.schedule_id,
        type: { $ne: "cache" }
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
      .where({ request_id: requestId })
      .where({ job_id: jobId })
      .where({ schedule_id: scheduleId })
      .whereNot({ type: "cache" });

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataMongodb(requestId: string, jobId: string, scheduleId: string): Promise<any> {
    const results = await this.storeConnection
      .db('observatory')
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
        type: { $ne: "cache" }
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
        type: { $ne: "cache" }
      }
    });

    return this.groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceKnex(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, cacheType, key } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "stats") : "";
    const cacheTypeSQL = cacheType === "all" ? "" : this.getInclusionSQL(cacheType, "hasMissed");
    const keySQL = key ? this.getEqualitySQL(key, "key") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "cache")
      .whereRaw(periodSQL)
      .whereRaw(querySQL)
      .whereRaw(cacheTypeSQL)
      .whereRaw(keySQL)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "cache")
      .whereRaw(periodSQL)
      .whereRaw(querySQL)
      .whereRaw(cacheTypeSQL)
      .whereRaw(keySQL)
      .count();

    return { results, count: count[0].count };
  }

  protected async getIndexTableDataByInstanceSQL(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, cacheType, key } = filters;
    let periodSql = period ? this.getPeriodSQL(period) : "";
    let querySql = query ? this.getInclusionSQL(query, "stats") : "";
    let statusSql = cacheType === "all" ? "" : this.getStatusSQL(cacheType);
    let keySql = key ? this.getEqualitySQL(key, "key") : "";


    const [results] = (await this.storeConnection.query(
      `SELECT * FROM observatory_entries WHERE type = 'cache' ${periodSql} ${querySql} ${statusSql} ${keySql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    )) as [any[]];

    console.log(results);

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries WHERE type = 'cache' ${periodSql} ${querySql} ${statusSql} ${keySql}`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, cacheType, key } = filters;
    const periodFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "stats": { $regex: query } } : {};
    const cacheTypeFilter = cacheType === "all" ? {} : { "hasMissed": cacheType };
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "cache",
        ...periodFilter,
        ...queryFilter,
        ...cacheTypeFilter,
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
        type: "cache",
        ...periodFilter,
        ...queryFilter,
        ...cacheTypeFilter,
        ...keyFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, cacheType, key } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "stats": { contains: query } } : {};
    const cacheTypeFilter = cacheType === "all" ? {} : { "hasMissed": cacheType };
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...periodFilter,
        ...queryFilter,
        ...cacheTypeFilter,
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
        ...cacheTypeFilter,
        ...keyFilter
      } 
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: CacheFilters): Promise<any> { 
    const { period, limit, offset, query, cacheType, key } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "stats": { contains: query } } : {};
    const cacheTypeFilter = cacheType === "all" ? {} : { "hasMissed": cacheType };
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {  
        ...periodFilter,
        ...queryFilter,
        ...cacheTypeFilter,
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
        ...cacheTypeFilter,
        ...keyFilter
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, cacheType, key } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "stats": { contains: query } } : {};
    const cacheTypeFilter = cacheType === "all" ? {} : { "hasMissed": cacheType };
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...periodFilter,
        ...queryFilter,
        ...cacheTypeFilter,
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
        ...cacheTypeFilter,
        ...keyFilter
      } 
    });

    return { results, count };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "stats") : "";
    const keySql = key ? this.getEqualitySQL(key, "key") : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
      JSON_UNQUOTE(JSON_EXTRACT(content, '$.key')) as cache_key,
      COUNT(*) as total,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
      MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as shortest,
      MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as longest,
      AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10, 6))) as average,
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
      WHERE type = 'cache' ${periodSql} ${querySql} ${keySql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.wasSet')) IS NULL
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.key'))
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}`
    )) as [any];

     const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.key'))) as total FROM observatory_entries WHERE type = 'cache' ${periodSql} ${querySql} ${keySql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.wasSet')) IS NULL`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupKnex(filters: CacheFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "key") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "cache")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.key")) as key'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.hit") = true THEN 1 ELSE 0 END) as hits'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.hit") = false THEN 1 ELSE 0 END) as misses'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.size")) AS DECIMAL(10,2))) as avg_size')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.key"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "cache")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.key"))'));

    return {
      results: results.map((row: any) => ({
        ...row,
        shortest: parseFloat(row.shortest || 0).toFixed(2),
        longest: parseFloat(row.longest || 0).toFixed(2),
        average: parseFloat(row.average || 0).toFixed(2),
        avg_size: parseFloat(row.avg_size || 0).toFixed(2),
        hit_ratio: row.count ? (row.hits / row.count * 100).toFixed(2) : '0.00'
      })),
      count: count[0]['count']
    };
  }

  protected async getIndexTableDataByGroupMongodb(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "content.stats": { $regex: query, $options: 'i' } } : {};
    const keyFilter = key ? { "content.key": key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "cache",
            ...timeFilter,
            ...queryFilter,
            ...keyFilter
          }
        },
        {
          $group: {
            _id: "$content.key",
            cache_key: { $first: "$content.key" },
            total: { $sum: 1 },
            misses: { $sum: "$content.stats.misses" },
            hits: { $sum: "$content.stats.hits" },
            writes: { $sum: "$content.stats.write" },
            shortest: { $min: "$content.duration" },
            longest: { $max: "$content.duration" },
            average: { $avg: "$content.duration" }
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
      .distinct("content.key", {
        type: "cache",
        ...timeFilter,
        ...queryFilter,
        ...keyFilter
      });

    return { results, count: count.length };
  }

  protected async getIndexTableDataByGroupPrisma(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, key } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { "stats": { contains: query } } : {};
    const keyFilter = key ? { key } : {};

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

  protected async getIndexTableDataByGroupTypeorm(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, key } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)  
      }
    } : {};
    const queryFilter = query ? { "stats": { contains: query } } : {};
    const keyFilter = key ? { key } : {};

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

  protected async getIndexTableDataByGroupSequelize(filters: CacheFilters): Promise<any> {
    const { period, limit, offset, query, key } = filters;
    const periodFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { "stats": { contains: query } } : {};
    const keyFilter = key ? { key } : {};

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
  protected async getIndexGraphDataKnex(filters: CacheFilters): Promise<any> {
    const { period, key } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const keySQL = key ? this.getEqualitySQL(key, "key") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "cache")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(keySQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.hit") = true THEN 1 ELSE 0 END) as hits'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.hit") = false THEN 1 ELSE 0 END) as misses'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.size")) AS DECIMAL(10,2))) as avg_size'),
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
      .where("type", "cache")
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
      hits: aggregateResults.hits,
      misses: aggregateResults.misses,
      hit_ratio: aggregateResults.total ? (aggregateResults.hits / aggregateResults.total * 100).toFixed(2) : '0.00',
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      avg_size: parseFloat(aggregateResults.avg_size || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: CacheFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getEqualitySQL(key, "key") : "";

    const [results] = (await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.misses')) > 0 THEN 1 ELSE 0 END) as misses,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.hits')) > 0 THEN 1 ELSE 0 END) as hits,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.writes')) > 0 THEN 1 ELSE 0 END) as writes,
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
        WHERE type = 'cache' ${periodSql} ${keySql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          NULL as misses,
          NULL as hits,
          NULL as writes,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'cache' ${periodSql} ${keySql}
        ORDER BY created_at DESC
      );`
    )) as [any[], any];

    const aggregateResults: {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      misses: string | null;
      hits: string | null;
      writes: string | null;
      p95: string | null;
    } = results.shift();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.hits, true),
      indexCountTwo: this.formatValue(aggregateResults.writes, true),
      indexCountThree: this.formatValue(aggregateResults.misses, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  }

  protected async getIndexGraphDataMongodb(filters: CacheFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "cache",
        ...timeFilter,
        ...keyFilter
      })
      .toArray();

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataPrisma(filters: CacheFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...timeFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
    });

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataTypeorm(filters: CacheFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {  
        ...timeFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
    });

    return this.durationGraphData(results, period as string);
  } 

  protected async getIndexGraphDataSequelize(filters: CacheFilters): Promise<any> {
    const { period, key } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const keyFilter = key ? { key } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {  
        ...timeFilter,
        ...keyFilter
      },
      orderBy: { created_at: "desc" },
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
      misses: 0,
      hits: 0,
      writes: 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((cache: any) => {
      const cacheTime = new Date(cache.created_at).getTime();
      const hits = cache.content.hits ? 1 : 0;
      const misses = cache.content.misses ? 1 : 0;
      const writes = cache.content.writes ? 1 : 0;
      const intervalIndex = Math.floor(
        (cacheTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          misses: groupedData[intervalIndex].misses + misses,
          hits: groupedData[intervalIndex].hits + hits,
          writes: groupedData[intervalIndex].writes + writes,
        };
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): CacheFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      limit: parseInt(req.query.limit as string, 10) || 20,
      offset: parseInt(req.query.offset as string, 10) || 0,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      query: req.query.q as string,
      cacheType: req.query.status as "all" | "misses" | "hits" | "writes",
      key: req.query.key as string,
    };
  }
}

export default CacheWatcher;