

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface ModelFilters extends WatcherFilters {
  index: "instance" | "group";
  model?: string;
  status?: "all" | "completed" | "failed";
}

class ModelWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "model";

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
      .where({uuid: id, type: this.type})

    const item = results[0];

    const relatedItems = await this.storeConnection("observatory_entries")
      .where("request_id", item.request_id)
      .where("job_id", item.job_id)
      .where("schedule_id", item.schedule_id)
      .whereNot("type", "model");

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
        $or: [{ uuid: id }]
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
        type: { $ne: this.type }
      })
      .toArray();

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [{ uuid: id }]
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
    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        OR: [{ uuid: id }]
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
   * Data Access Methods
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

  protected async getIndexTableDataByInstanceKnex(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query, status } = filters;
    const modelSQL = model ? this.getEqualitySQL(model, "modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "modelName") : "";
    const statusSQL = status ? this.getStatusSQL(status) : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "model")
      .whereRaw(modelSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "model")
      .whereRaw(modelSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(statusSQL || "1=1")
      .count()
      .first();

    return { 
      results, 
      count: count?.count > 999 ? (count.count / 1000).toFixed(2) + "K" : count?.count 
    };
  }

  protected async getIndexTableDataByInstanceSQL(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query, status } = filters;
    const modelSQL = model ? this.getEqualitySQL(model, "modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "modelName") : "";
    const statusSQL = status ? this.getStatusSQL(status) : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'model' ${modelSQL} ${querySQL} ${statusSQL}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries
       WHERE type = 'model' ${modelSQL} ${querySQL} ${statusSQL}`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query } = filters;
    const modelSQL = model ? this.getEqualitySQL(model, "modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "modelName") : ""; 

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({ type: "model", modelSQL, querySQL })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .countDocuments({ type: "model", modelSQL, querySQL });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query, status } = filters;
    
    const results = await this.storeConnection.observatoryEntry.findMany({  
      where: {
        type: "model",
        ...(model ? { modelName: model } : {}),
        ...(query ? { modelName: { contains: query } } : {}),
        ...(status && status !== "all" ? { 
          content: { path: ["status"], equals: status }
        } : {})
      },
      orderBy: { created_at: "desc" },  
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        type: "model",
        ...(model ? { modelName: model } : {}),
        ...(query ? { modelName: { contains: query } } : {}),
        ...(status && status !== "all" ? {
          content: { path: ["status"], equals: status }
        } : {})
      }
    });

    return { results, count: this.formatValue(count, true) };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query, status } = filters;
    
    const [results, count] = await this.storeConnection.observatoryEntry.findAndCount({
      where: {
        type: "model",
        ...(model ? { modelName: model } : {}),
        ...(query ? { modelName: { contains: query } } : {}),
        ...(status && status !== "all" ? {
          content: { path: ["status"], equals: status }
        } : {})
      },
      order: { created_at: "DESC" },
      skip: offset,
      take: limit
    });

    return { results, count: this.formatValue(count, true) };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query } = filters;
    const modelSQL = model ? this.getEqualitySQL(model, "modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "modelName") : "";

    const results = await this.storeConnection.observatoryEntry.find({  
      where: {
        type: "model",
        modelName: modelSQL,
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

  protected async getIndexTableDataByGroupKnex(filters: ModelFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "model") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "model")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.model")) as model'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.operation") = "create" THEN 1 ELSE 0 END) as creates'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.operation") = "update" THEN 1 ELSE 0 END) as updates'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.operation") = "delete" THEN 1 ELSE 0 END) as deletes')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.model"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "model")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.model"))'));

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

  protected async getIndexTableDataByGroupSQL(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query } = filters;
    const modelSQL = model ? this.getEqualitySQL(model, "modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "modelName") : "";

    const [results] = await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.modelName')) as modelName,
        COUNT(*) as total,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'success' THEN 1 ELSE 0 END) as count_success,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'error' THEN 1 ELSE 0 END) as count_error,
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
        WHERE type = 'model' ${modelSQL} ${querySQL}
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.modelName'))
        ORDER BY total DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.modelName'))) as total 
       FROM observatory_entries 
       WHERE type = 'model' ${modelSQL} ${querySQL}`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupMongodb(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query } = filters;
    
    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "model",
            ...(model ? { "content.modelName": model } : {}),
            ...(query ? { "content.modelName": { $regex: query, $options: 'i' } } : {})
          }
        },
        {
          $group: {
            _id: "$content.modelName",
            modelName: { $first: "$content.modelName" },
            total: { $sum: 1 },
            count_success: { 
              $sum: { $cond: [{ $eq: ["$content.status", "success"] }, 1, 0] }
            },
            count_error: {
              $sum: { $cond: [{ $eq: ["$content.status", "error"] }, 1, 0] }
            },
            shortest: { $min: "$content.duration" },
            longest: { $max: "$content.duration" },
            average: { $avg: "$content.duration" },
            durations: { $push: "$content.duration" }
          }
        },
        {
          $project: {
            _id: 0,
            modelName: 1,
            total: 1,
            count_success: 1,
            count_error: 1,
            shortest: { $round: ["$shortest", 2] },
            longest: { $round: ["$longest", 2] },
            average: { $round: ["$average", 2] },
            p95: {
              $round: [
                { $arrayElemAt: [
                  "$durations",
                  { $floor: { $multiply: [0.95, { $size: "$durations" }] } }
                ] },
                2
              ]
            }
          }
        },
        { $sort: { total: -1 } },
        { $skip: offset },
        { $limit: limit }
      ])
      .toArray();

    const totalCount = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .distinct("content.modelName", { type: "model" });

    return { 
      results, 
      count: totalCount.length > 999 ? (totalCount.length / 1000).toFixed(2) + "K" : totalCount.length 
    };
  }

  protected async getIndexTableDataByGroupPrisma(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query } = filters;

    const results = await this.storeConnection.$queryRaw`
      SELECT
        "modelName",
        COUNT(*) as total,
        SUM(CASE WHEN content->>'status' = 'success' THEN 1 ELSE 0 END) as count_success,
        SUM(CASE WHEN content->>'status' = 'error' THEN 1 ELSE 0 END) as count_error,
        MIN(CAST(content->>'duration' as DECIMAL(10,2))) as shortest,
        MAX(CAST(content->>'duration' as DECIMAL(10,2))) as longest,
        AVG(CAST(content->>'duration' as DECIMAL(10,2))) as average,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(content->>'duration' as DECIMAL(10,2))) as p95
      FROM observatory_entries
      WHERE type = 'model'
        ${model ? `AND "modelName" = '${model}'` : ''}
        ${query ? `AND "modelName" ILIKE '%${query}%'` : ''}
      GROUP BY "modelName"
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countResult] = await this.storeConnection.$queryRaw`
      SELECT COUNT(DISTINCT "modelName") as total
      FROM observatory_entries
      WHERE type = 'model'
        ${model ? `AND "modelName" = '${model}'` : ''}
        ${query ? `AND "modelName" ILIKE '%${query}%'` : ''}
    `;

    return { results, count: this.formatValue(countResult.total, true) };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query } = filters;

    const results = await this.storeConnection.query(`
      SELECT
        "modelName",
        COUNT(*) as total,
        SUM(CASE WHEN content->>'status' = 'success' THEN 1 ELSE 0 END) as count_success,
        SUM(CASE WHEN content->>'status' = 'error' THEN 1 ELSE 0 END) as count_error,
        MIN(CAST(content->>'duration' as DECIMAL(10,2))) as shortest,
        MAX(CAST(content->>'duration' as DECIMAL(10,2))) as longest,
        AVG(CAST(content->>'duration' as DECIMAL(10,2))) as average,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(content->>'duration' as DECIMAL(10,2))) as p95
      FROM observatory_entries
      WHERE type = 'model'
        ${model ? `AND "modelName" = '${model}'` : ''}
        ${query ? `AND "modelName" ILIKE '%${query}%'` : ''}
      GROUP BY "modelName"
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const [countResult] = await this.storeConnection.query(`
      SELECT COUNT(DISTINCT "modelName") as total
      FROM observatory_entries
      WHERE type = 'model'
        ${model ? `AND "modelName" = '${model}'` : ''}
        ${query ? `AND "modelName" ILIKE '%${query}%'` : ''}
    `);

    return { results, count: this.formatValue(countResult.total, true) };
  }

  protected async getIndexTableDataByGroupSequelize(filters: ModelFilters): Promise<any> {
    const { limit, offset, model, query } = filters;
    const modelSQL = model ? this.getEqualitySQL(model, "modelName") : "";
    const querySQL = query ? this.getInclusionSQL(query, "modelName") : "";

    const results = await this.storeConnection.observatoryEntry.groupBy({
      by: ["modelName"],
      _count: true
    }, {
      where: {
        type: "model",
        modelName: { contains: query }  
      },
      orderBy: { modelName: "desc" },
      offset,
      limit
    }); 

    return { results, count: results.length };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataKnex(filters: ModelFilters): Promise<any> {
    const { period, model } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const modelSQL = model ? this.getEqualitySQL(model, "model") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "model")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(modelSQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.operation") = "create" THEN 1 ELSE 0 END) as creates'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.operation") = "update" THEN 1 ELSE 0 END) as updates'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.operation") = "delete" THEN 1 ELSE 0 END) as deletes'),
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
      .where("type", "model")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(modelSQL || "1=1")
      .select("created_at", "content")
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      creates: aggregateResults.creates,
      updates: aggregateResults.updates,
      deletes: aggregateResults.deletes,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: ModelFilters): Promise<any> {
    const { period } = filters;
    const timeSql = period ? this.getPeriodSQL(period) : "";

    const [results] = (await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'completed' THEN 1 ELSE 0 END) as count_completed,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'failed' THEN 1 ELSE 0 END) as count_failed,
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
        WHERE type = 'model' ${timeSql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          NULL as count_completed,
          NULL as count_failed,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'model' ${timeSql}
        ORDER BY created_at DESC
      );`
    )) as [any[], any];

    const aggregateResults: {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      p95: string | null;
      count_completed: number;
      count_failed: number;
    } = results.shift();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      indexCountOne: this.formatValue(aggregateResults.count_completed, true),
      indexCountTwo: this.formatValue(aggregateResults.count_failed, true),
      count: this.formatValue(aggregateResults.total, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  }

  protected async getIndexGraphDataMongodb(filters: ModelFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};

    const [aggregateResults] = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "model",
            ...timeFilter
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { 
              $sum: { $cond: [{ $eq: ["$content.status", "completed"] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$content.status", "failed"] }, 1, 0] }
            },
            shortest: { $min: "$content.duration" },
            longest: { $max: "$content.duration" },
            average: { $avg: "$content.duration" },
            durations: { $push: "$content.duration" }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            completed: 1,
            failed: 1,
            shortest: { $round: ["$shortest", 2] },
            longest: { $round: ["$longest", 2] },
            average: { $round: ["$average", 2] },
            p95: {
              $round: [
                { $arrayElemAt: [
                  "$durations",
                  { $floor: { $multiply: [0.95, { $size: "$durations" }] } }
                ] },
                2
              ]
            }
          }
        }
      ])
      .toArray();

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({ type: "model", ...timeFilter })
      .sort({ created_at: -1 })
      .toArray();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.completed, true),
      indexCountTwo: this.formatValue(aggregateResults.failed, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95)
    };
  }

  protected async getIndexGraphDataPrisma(filters: ModelFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};

    const aggregateResults = await this.storeConnection.$queryRaw`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN content->>'status' = 'completed' THEN 1 ELSE 0 END) as count_completed,
        SUM(CASE WHEN content->>'status' = 'failed' THEN 1 ELSE 0 END) as count_failed,
        MIN(CAST(content->>'duration' as DECIMAL(10,2))) as shortest,
        MAX(CAST(content->>'duration' as DECIMAL(10,2))) as longest,
        AVG(CAST(content->>'duration' as DECIMAL(10,2))) as average,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(content->>'duration' as DECIMAL(10,2))) as p95
      FROM observatory_entries
      WHERE type = 'model'
        ${period ? `AND created_at >= NOW() - INTERVAL '${this.periods[period]} minutes'` : ''}
    `;

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        type: "model",
        ...timeFilter
      },
      orderBy: { created_at: "desc" }
    });

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(aggregateResults[0].total, true),
      indexCountOne: this.formatValue(aggregateResults[0].count_completed, true),
      indexCountTwo: this.formatValue(aggregateResults[0].count_failed, true),
      shortest: this.formatValue(aggregateResults[0].shortest),
      longest: this.formatValue(aggregateResults[0].longest),
      average: this.formatValue(aggregateResults[0].average),
      p95: this.formatValue(aggregateResults[0].p95)
    };
  }

  protected async getIndexGraphDataTypeorm(filters: ModelFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};

    const [aggregateResults] = await this.storeConnection.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN content->>'status' = 'completed' THEN 1 ELSE 0 END) as count_completed,
        SUM(CASE WHEN content->>'status' = 'failed' THEN 1 ELSE 0 END) as count_failed,
        MIN(CAST(content->>'duration' as DECIMAL(10,2))) as shortest,
        MAX(CAST(content->>'duration' as DECIMAL(10,2))) as longest,
        AVG(CAST(content->>'duration' as DECIMAL(10,2))) as average,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY CAST(content->>'duration' as DECIMAL(10,2))) as p95
      FROM observatory_entries
      WHERE type = 'model'
        ${period ? `AND created_at >= NOW() - INTERVAL '${this.periods[period]} minutes'` : ''}
    `);

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        type: "model",
        ...timeFilter
      },
      order: { created_at: "DESC" }
    });

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.count_completed, true),
      indexCountTwo: this.formatValue(aggregateResults.count_failed, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95)
    };
  } 

  protected async getIndexGraphDataSequelize(filters: ModelFilters): Promise<any> {
    const { period, model } = filters;
    const modelSQL = model ? this.getEqualitySQL(model, "modelName") : "";
    const periodSQL = period ? this.getPeriodSQL(period) : "";

    const data = await this.storeConnection.observatoryEntry.find({ 
      where: {
        type: "model",
        ...(modelSQL ? { modelName: modelSQL } : {}),
        created_at: {
          gte: new Date(Date.now() - this.periods[period as "1h" | "24h" | "7d" | "14d" | "30d"] * 60 * 1000)
        } 
      },
      orderBy: { created_at: "desc" }
    });

    const countFormattedData = this.countGraphData(data, period as string);
    const durationFormattedData = this.durationGraphData(data, period as string); 

    return {
      results: data,
      countFormattedData,
      durationFormattedData
    };
  }

  /**
   * Protected Helper Methods
   * --------------------------------------------------------------------------
   */
  protected countGraphData(data: any, period: string) {
    const totalDuration = this.periods[period as keyof typeof this.periods];
    const intervalDuration = totalDuration / 120;
    const now = new Date().getTime();
    const startDate = now - totalDuration * 60 * 1000;

    const groupedData = Array.from({ length: 120 }, (_, index) => ({
      "completed": 0,
      "failed": 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((model: any) => {
      const modelTime = new Date(model.created_at).getTime();
      const statusCode = model.content.status;
      const intervalIndex = Math.floor(
        (modelTime - startDate) / (intervalDuration * 60 * 1000)
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

  private getStatusSQL(type: string) {
    return type === "all" ? '' : `AND JSON_EXTRACT(content, '$.status') = '${type}'`;
  }

  protected extractFiltersFromRequest(req: Request): ModelFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      status: req.query.status as "all" | "completed" | "failed",
      model: req.query.key as string,
    };
  }
}

export default ModelWatcher;