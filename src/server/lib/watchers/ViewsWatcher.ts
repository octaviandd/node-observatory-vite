import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface ViewFilters extends WatcherFilters {
  index: "instance" | "group";
  path?: string;
  status: "all" | "completed" | "failed";
}

class ViewWatcher extends BaseWatcher {
  readonly type = "view";

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
      .where({ request_id: item.request_id })
      .where({ job_id: item.job_id })
      .where({ schedule_id: item.schedule_id })
      .whereNot({ type: this.type });

    const allItems = results.concat(relatedItems);
    return this.groupItemsByType(allItems);
  }

  protected async handleViewSQL(id: string): Promise<any> {
    console.log('hit')
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

    if(!item.request_id && !item.schedule_id && !item.job_id) {
      return this.groupItemsByType(results);
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
  protected async handleRelatedDataSQL(viewId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    if(!requestId && !jobId && !scheduleId) {
      return {}
    }

    const [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE request_id = ? AND type != ?",
      [requestId, this.type]

    );

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
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        batch_id: batchId,
        type: { $ne: this.type }
      } 
    });
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataTypeorm(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        batch_id: batchId,
        type: { $ne: this.type }
      }
    });
    return this.groupItemsByType(results);  
  }

  protected async handleRelatedDataSequelize(batchId: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: { batch_id: batchId, type: { not: this.type } }
    });
    return this.groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceKnex(filters: ViewFilters): Promise<any> {
    const { query, offset, limit, path, period } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "view") : "";
    const pathSQL = path ? this.getInclusionSQL(path, "view") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'view' ${querySQL} ${pathSQL} ${periodSQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'view' ${querySQL} ${pathSQL} ${periodSQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: ViewFilters): Promise<any> {
    const { query, offset, limit, path, period, status } = filters;
    const querySql = query ? this.getInclusionSQL(query, "view") : "";
    const pathSql = path ? this.getInclusionSQL(path, "view") : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const statusSql = status !== "all" ? this.getEqualitySQL(status, "status") : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'view' ${querySql} ${pathSql} ${periodSql} ${statusSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries
       WHERE type = 'view' ${querySql} ${pathSql} ${periodSql} ${statusSql}`
    );

    return { results, count: countResult[0].total > 999 ? (countResult[0].total / 1000).toFixed(2) + "K" : countResult[0].total };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: ViewFilters): Promise<any> {
    const { query, offset, limit, path, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { view: { $regex: query, $options: 'i' } } : {};
    const pathFilter = path ? { view: { $regex: path, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "view",
        ...timeFilter,
        ...queryFilter,
        ...pathFilter
      })
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const count = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .countDocuments({
        type: "view",
        ...timeFilter,
        ...queryFilter,
        ...pathFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: ViewFilters): Promise<any> {
    const { query, offset, limit, path, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { view: { contains: query } } : {};
    const pathFilter = path ? { view: { contains: path } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...timeFilter,
        ...queryFilter,
        ...pathFilter,
        type: "view"
      },
      orderBy: { created_at: "desc" },  
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {    
        ...timeFilter,
        ...queryFilter,
        ...pathFilter,
        type: "view"
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: ViewFilters): Promise<any> {
    const { query, offset, limit, path, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { view: { contains: query } } : {};
    const pathFilter = path ? { view: { contains: path } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,
        ...queryFilter,
        ...pathFilter,
        type: "view"
      },
      orderBy: { created_at: "desc" },
      skip: offset, 
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...timeFilter,    
        ...queryFilter,
        ...pathFilter,
        type: "view"
      }
    }); 

    return { results, count };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: ViewFilters): Promise<any> {
    const { query, offset, limit, path, period } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};

    const queryFilter = query ? { view: { contains: query } } : {};
    const pathFilter = path ? { view: { contains: path } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...queryFilter,
        ...pathFilter,
        type: "view"
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
  protected async getIndexTableDataByGroupKnex(filters: ViewFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "view") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "view")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.view")) as view'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.size")) AS DECIMAL(10,2))) as avgSize')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.view"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "view")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.view"))'));

    return {
      results: results.map((row: any) => ({
        ...row,
        shortest: parseFloat(row.shortest || 0).toFixed(2),
        longest: parseFloat(row.longest || 0).toFixed(2),
        average: parseFloat(row.average || 0).toFixed(2),
        avgSize: parseFloat(row.avgSize || 0).toFixed(2)
      })),
      count: count[0]['count']
    };
  }

  protected async getIndexTableDataByGroupSQL(filters: ViewFilters): Promise<any> {
    const { offset, limit, query, period , status} = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "view") : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
      JSON_UNQUOTE(JSON_EXTRACT(content, '$.view')) as view,
      COUNT(*) as total,
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
      CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
      CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.size')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as size
      FROM observatory_entries
      WHERE type = 'view' ${querySql} ${periodSql}
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.view'))
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}`
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.view'))) as total FROM observatory_entries WHERE type = 'view' ${querySql} ${periodSql}`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupMongodb(filters: ViewFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { view: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "view",
            ...timeFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$view",
            path: { $first: "$view" },
            count: { $sum: 1 },
            avgDuration: { $avg: "$duration" },
            avgSize: { $avg: "$size" }
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
      .distinct("view", {
        type: "view",
        ...timeFilter,
        ...queryFilter
      });

    return { results, count: count.length };
  }

  protected async getIndexTableDataByGroupPrisma(filters: ViewFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { view: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...queryFilter,
        type: "view"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit 
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...timeFilter,
        ...queryFilter, 
        type: "view"
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: ViewFilters): Promise<any> {
    const { offset, limit, query, period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const queryFilter = query ? { view: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,  
        ...queryFilter,
        type: "view"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });   

    const count = await this.storeConnection.observatoryEntry.count({
      where: {
        ...timeFilter,
        ...queryFilter,
        type: "view"  
      }
    });

    return { results, count };
  }
  
  protected async getIndexTableDataByGroupSequelize(filters: ViewFilters): Promise<any> {
    const { query, offset, limit, path, period } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};

    const queryFilter = query ? { view: { contains: query } } : {};
    const pathFilter = path ? { view: { contains: path } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...queryFilter,
        ...pathFilter,
        type: "view"
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
  protected async getIndexGraphDataKnex(filters: ViewFilters): Promise<any> {
    const { period, path } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const pathSQL = path ? this.getEqualitySQL(path, "view") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "view")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(pathSQL || "1=1")
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
      .where("type", "view")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(pathSQL || "1=1")
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
      p95: aggregateResults.p95 ? parseFloat(aggregateResults.p95).toFixed(2) : 0
    };
  }

  protected async getIndexGraphDataSQL(filters: ViewFilters): Promise<any> {
    const { period, path } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const pathSql = path ? this.getInclusionSQL(path, "view") : "";

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
        WHERE type = 'view' ${periodSql} ${pathSql}
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
        WHERE type = 'view' ${periodSql} ${pathSql}
        ORDER BY created_at DESC
      );`
    );

    const aggregateResults: {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      completed: string | null;
      failed: string | null;
      p95: string | null;
    } = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);


    return {
      results,
      countFormattedData,
      durationFormattedData,
      indexCountOne: this.formatValue(aggregateResults.completed, true),
      indexCountTwo: this.formatValue(aggregateResults.failed, true),
      count: this.formatValue(aggregateResults.total, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95)
    };
  }

  protected async getIndexGraphDataMongodb(filters: ViewFilters): Promise<any> {
    const { period, path } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const pathFilter = path ? { view: { $regex: path, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "view",
            ...timeFilter,
            ...pathFilter
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

    const views = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "view",
        ...timeFilter,
        ...pathFilter
      })
      .toArray();

    const countFormattedData = this.countGraphData(views, period as string);
    const durationFormattedData = this.durationGraphData(views, period as string);
    const aggregateResults = results[0] || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: views,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: aggregateResults.shortest ? parseFloat(aggregateResults.shortest).toFixed(2) : 0,
      longest: aggregateResults.longest ? parseFloat(aggregateResults.longest).toFixed(2) : 0,
      average: aggregateResults.average ? parseFloat(aggregateResults.average).toFixed(2) : 0
    };
  }

  protected async getIndexGraphDataPrisma(filters: ViewFilters): Promise<any> {
    const { period, path } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const pathFilter = path ? { view: { contains: path } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...pathFilter,
        type: "view"
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
      // average: parseFloat(results.reduce((sum, view) => sum + parseFloat(view.duration || 0), 0) / results.length || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataTypeorm(filters: ViewFilters): Promise<any> {
    const { period, path } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const pathFilter = path ? { view: { contains: path } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,
        ...pathFilter,
        type: "view"
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
      // average: parseFloat(results.reduce((sum, view) => sum + parseFloat(view.duration || 0), 0) / results.length || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSequelize(filters: ViewFilters): Promise<any> {
    const { period, path } = filters;
    const timeFilter = period ? {
      created_at: {
        gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};

    // const queryFilter = query ? { view: { contains: query } } : {};
    const pathFilter = path ? { view: { contains: path } } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,
        // ...queryFilter,
        ...pathFilter,
        type: "view"
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

    data.forEach((view: any) => {
      const viewTime = new Date(view.created_at).getTime();
      const status = view.content.status;
      const intervalIndex = Math.floor(
        (viewTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        if (status === "completed") {
            groupedData[intervalIndex].completed++;
          } else {
            groupedData[intervalIndex].failed++;
          }
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): ViewFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      path: req.query.key as string,
      status: req.query.status as "all" | "completed" | "failed",
    };
  }
}

export default ViewWatcher;
