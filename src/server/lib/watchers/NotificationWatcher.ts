import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface NotificationFilters extends WatcherFilters {
  type?: string;
  channel?: string;
  status: string;
  index: "instance" | "group";
}

class NotificationWatcher extends BaseWatcher {
  readonly type = "notification";

  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  private getStatusSQL(status: string) {
    return status === "all" ? "" : `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = '${status}'`;
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
      include: { relatedItems: true }
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

  protected async handleRelatedDataKnex(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    let query = this.storeConnection("observatory_entries")
      .whereNot({ type: this.type });

    if (requestId) {
      query = query.where({ request_id: requestId });
    }

    if (jobId) {
      query = query.where({ job_id: jobId })
        .whereRaw("JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) IN ('released', 'completed', 'failed')");
    }

    if (scheduleId) {
      query = query.where({ schedule_id: scheduleId });
    }

    if (!requestId && !jobId && !scheduleId) {
      return {};
    }

    const results = await query;
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataMongodb(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    if (!requestId && !jobId && !scheduleId) {
      return {};
    }

    let query: any = { type: { $ne: this.type } };

    if (requestId) {
      query.request_id = requestId;
    }

    if (jobId) {
      query.job_id = jobId;
      query["content.status"] = { $in: ["released", "completed", "failed"] };
    }

    if (scheduleId) {
      query.schedule_id = scheduleId;
    }

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find(query)
      .toArray();

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataPrisma(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    if (!requestId && !jobId && !scheduleId) {
      return {};
    }

    let conditions: any = { type: { not: this.type } };

    if (requestId) {
      conditions.request_id = requestId;
    }

    if (jobId) {
      conditions.job_id = jobId;
      conditions.content = {
        path: "$.status",
        in: ["released", "completed", "failed"]
      };
    }

    if (scheduleId) {
      conditions.schedule_id = scheduleId;
    }

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: conditions
    });

    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataTypeorm(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    if (!requestId && !jobId && !scheduleId) {
      return {};
    }

    let queryBuilder = this.storeConnection
      .getRepository("observatory_entries")
      .createQueryBuilder("entry")
      .where("entry.type != :type", { type: this.type });

    if (requestId) {
      queryBuilder = queryBuilder.andWhere("entry.request_id = :requestId", { requestId });
    }

    if (jobId) {
      queryBuilder = queryBuilder
        .andWhere("entry.job_id = :jobId", { jobId })
        .andWhere("JSON_EXTRACT(entry.content, '$.status') IN ('released', 'completed', 'failed')");
    }

    if (scheduleId) {
      queryBuilder = queryBuilder.andWhere("entry.schedule_id = :scheduleId", { scheduleId });
    }

    const results = await queryBuilder.getMany();
    return this.groupItemsByType(results);
  }

  protected async handleRelatedDataSequelize(modelId: string, requestId: string, jobId: string, scheduleId: string): Promise<any> {
    if (!requestId && !jobId && !scheduleId) {
      return {};
    }

    const conditions: any = {
      type: { [this.storeConnection.Sequelize.Op.ne]: this.type }
    };

    if (requestId) {
      conditions.request_id = requestId;
    }

    if (jobId) {
      conditions.job_id = jobId;
      conditions[this.storeConnection.Sequelize.Op.and] = [
        this.storeConnection.Sequelize.literal("JSON_EXTRACT(content, '$.status') IN ('released', 'completed', 'failed')")
      ];
    }

    if (scheduleId) {
      conditions.schedule_id = scheduleId;
    }

    const results = await this.storeConnection.models.ObservatoryEntry.findAll({
      where: conditions
    });

    return this.groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceKnex(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelSQL = channel ? this.getEqualitySQL(channel, "channel") : "";
    const querySQL = query ? this.getInclusionSQL(query, "channel") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'notification' ${channelSQL} ${querySQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'notification' ${channelSQL} ${querySQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query, status } = filters;
    const channelSql = channel ? this.getEqualitySQL(channel, "channel") : "";
    const querySql = query ? this.getInclusionSQL(query, "channel") : "";
    const statusSql = status ? this.getStatusSQL(status) : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries 
       WHERE type = 'notification' ${channelSql} ${querySql} ${statusSql} 
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) != 'pending'
       ORDER BY created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total   
       FROM observatory_entries 
       WHERE type = 'notification' ${channelSql} ${querySql} ${statusSql}
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) != 'pending'`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelFilter = channel ? { channel } : {};
    const queryFilter = query ? { channel: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "notification",
        ...channelFilter,
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
        type: "notification",
        ...channelFilter,
        ...queryFilter
      });

    return { results, count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelFilter = channel ? { channel } : {};
    const queryFilter = query ? { channel: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...channelFilter,
        ...queryFilter,
        type: "notification"
      },
      orderBy: { created_at: "desc" },  
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {  
        ...channelFilter,
        ...queryFilter,
        type: "notification"
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelFilter = channel ? { channel } : {};
    const queryFilter = query ? { channel: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...channelFilter,
        ...queryFilter,
        type: "notification"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {  
        ...channelFilter, 
        ...queryFilter,
        type: "notification"
      }
    });

    return { results, count };
  } 

  protected async getIndexTableDataByGroupSequelize(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelFilter = channel ? { channel } : {};
    const queryFilter = query ? { channel: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.groupBy({ 
      by: ["channel"],
      _count: true
    }, {
      where: {
        ...channelFilter,
        ...queryFilter  
      },
      orderBy: { channel: "desc" },
      offset,
      limit
    });   

    return { results, count: results.length };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupKnex(filters: NotificationFilters): Promise<any> {
    const { offset, limit, query, period, channel } = filters;
    let periodSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "channel") : "";
    let channelSQL = channel ? this.getEqualitySQL(channel, "channel") : "";

    const results = await this.storeConnection("observatory_entries")
      .where("type", "notification")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(channelSQL || "1=1")
      .select(
        this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.channel")) as channel'),
        this.storeConnection.raw('COUNT(*) as count'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "completed" THEN 1 ELSE 0 END) as completed'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") != "completed" THEN 1 ELSE 0 END) as failed')
      )
      .groupBy(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.channel"))'))
      .orderBy("count", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .where("type", "notification")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(querySQL || "1=1")
      .whereRaw(channelSQL || "1=1")
      .countDistinct(this.storeConnection.raw('JSON_UNQUOTE(JSON_EXTRACT(content, "$.channel"))'));

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

  protected async getIndexTableDataByGroupSQL(filters: NotificationFilters): Promise<any> {
    const { period, channel, query, offset, limit } = filters;
    const timeSql = period ? this.getPeriodSQL(period) : "";
    const channelSql = channel ? this.getEqualitySQL(channel, "channel") : "";
    const querySql = query ? this.getInclusionSQL(query, "channel") : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.channel')) AS channel,
        COUNT(*) as total,
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
        WHERE type = 'notification' ${timeSql} ${channelSql} ${querySql} AND JSON_EXTRACT(content, '$.status') != 'pending'
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.channel'))
        ORDER BY MAX(created_at) DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.channel'))) as total FROM observatory_entries WHERE type = 'notification' ${channelSql} ${timeSql}`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  protected async getIndexTableDataByGroupMongodb(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelFilter = channel ? { channel } : {};
    const queryFilter = query ? { channel: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "notification",
            ...channelFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$channel",
            channel: { $first: "$channel" },
            total: { $sum: 1 }
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

    const uniqueChannels = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .distinct("channel", {
        type: "notification",
        ...channelFilter,
        ...queryFilter
      });

    return { results, count: uniqueChannels.length };
  }

  protected async getIndexTableDataByGroupPrisma(filters: WatcherFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { channel: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...queryFilter,
        type: "notification"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit 
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {  
        ...queryFilter, 
        type: "notification"
      }
    });

    return { results, count };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelFilter = channel ? { channel } : {};
    const queryFilter = query ? { channel: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...channelFilter,
        ...queryFilter,
        type: "notification"
      },
      orderBy: { created_at: "desc" },  
      skip: offset,
      take: limit
    });

    const count = await this.storeConnection.observatoryEntry.count({
      where: {  
        ...channelFilter, 
        ...queryFilter,
        type: "notification"
      }
    });

    return { results, count };  
  }

  protected async getIndexTableDataByInstanceSequelize(filters: NotificationFilters): Promise<any> {
    const { limit, offset, channel, query } = filters;
    const channelFilter = channel ? { channel } : {};
    const queryFilter = query ? { channel: { contains: query } } : {};

    const results = await this.storeConnection.observatoryEntry.find({  
      where: {
        ...channelFilter,
        ...queryFilter,
        type: "notification"
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
  protected async getIndexGraphDataKnex(filters: NotificationFilters): Promise<any> {
    const { period, channel } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const channelSQL = channel ? this.getEqualitySQL(channel, "channel") : "";

    // Get aggregate data
    const aggregateResults = await this.storeConnection("observatory_entries")
      .where("type", "notification")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(channelSQL || "1=1")
      .select(
        this.storeConnection.raw('COUNT(*) as total'),
        this.storeConnection.raw('MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as shortest'),
        this.storeConnection.raw('MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as longest'),
        this.storeConnection.raw('AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, "$.duration")) AS DECIMAL(10,2))) as average'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") = "completed" THEN 1 ELSE 0 END) as completed'),
        this.storeConnection.raw('SUM(CASE WHEN JSON_EXTRACT(content, "$.status") != "completed" THEN 1 ELSE 0 END) as failed'),
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
      .where("type", "notification")
      .whereRaw(periodSQL || "1=1")
      .whereRaw(channelSQL || "1=1")
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
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2),
      p95: parseFloat(aggregateResults.p95 || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: NotificationFilters): Promise<any> {
    const { period, channel } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const channelSql = channel ? this.getEqualitySQL(channel, "channel") : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_EXTRACT(content, '$.status') = 'completed' THEN 1 ELSE 0 END) as completed,
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
        WHERE type = 'notification' ${periodSql} ${channelSql} AND JSON_EXTRACT(content, '$.status') != 'pending'
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
        WHERE type = 'notification' ${periodSql} ${channelSql} AND JSON_EXTRACT(content, '$.status') != 'pending'
        ORDER BY created_at DESC
      );`
    );

    const aggregateResults : {
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

  protected async getIndexGraphDataMongodb(filters: NotificationFilters): Promise<any> {
    const { period, channel } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const channelFilter = channel ? { channel } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "notification",
            ...timeFilter,
            ...channelFilter
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

    const notifications = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "notification",
        ...timeFilter,
        ...channelFilter
      })
      .toArray();

    const countFormattedData = this.countGraphData(notifications, period as string);
    const durationFormattedData = this.durationGraphData(notifications, period as string);
    const aggregateResults = results[0] || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: notifications,
      countFormattedData,
      durationFormattedData,
      ...aggregateResults
    };
  }

  protected async getIndexGraphDataTypeorm(filters: NotificationFilters): Promise<any> {
    const { period, channel } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const channelFilter = channel ? { channel } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...channelFilter,
        type: "notification"
      },
      orderBy: { created_at: "desc" }
    }); 

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataPrisma(filters: NotificationFilters): Promise<any> {
    const { period, channel } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }  
    } : {};
    const channelFilter = channel ? { channel } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...channelFilter,
        type: "notification"
      },
      orderBy: { created_at: "desc" }
    });

    return this.durationGraphData(results, period as string);
  }

  protected async getIndexGraphDataSequelize(filters: NotificationFilters): Promise<any> {
    const { period, channel } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};
    const channelFilter = channel ? { channel } : {};

    const results = await this.storeConnection.observatoryEntry.find({
      where: {
        ...timeFilter,
        ...channelFilter,
        type: "notification"
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

    data.forEach((notification: any) => {
      if (notification.content.status !== 'pending') {
        const notificationTime = new Date(notification.created_at).getTime();
        const status = notification.content.status;
        const intervalIndex = Math.floor(
          (notificationTime - startDate) / (intervalDuration * 60 * 1000)
        );

        if (intervalIndex >= 0 && intervalIndex < 120) {
          if (status === "completed") {
            groupedData[intervalIndex].completed++;
          } else {
            groupedData[intervalIndex].failed++;
          }
        }
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): NotificationFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      type: req.query.type as string,
      channel: req.query.key as string,
      status: req.query.status as "all" | "completed" | "failed",
      index: req.query.index as "instance" | "group",
    };
  }
}

export default NotificationWatcher;
