/** @format */

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface RedisFilters extends WatcherFilters {
  index: "instance" | "group";
  status: string;
}

class RedisWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "redis";

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
      .where({ batch_id: item.batch_id })
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
      "SELECT * FROM observatory_entries WHERE batch_id = ? AND type != ?",
      [item.batch_id, this.type]
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
          { batch_id: id, type: { $ne: this.type } }
        ]
      })
      .toArray();

    return this.groupItemsByType(results);
  }

  protected async handleViewPrisma(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [{ uuid: id }, { batch_id: id }],
        type: this.type
      } 
    });

    return this.groupItemsByType(results);
  }   

  protected async handleViewTypeorm(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        OR: [{ uuid: id }, { batch_id: id }],
        type: this.type
      } 
    });

    return this.groupItemsByType(results);
  }

  protected async handleViewSequelize(id: string): Promise<any> {
    const results = await this.storeConnection.observatoryEntry.find({
      where: { uuid: id, type: this.type },
      include: { relatedItems: true }
    });
    return this.groupItemsByType(results);
  }

  /**
   * Related Data Methods
   * --------------------------------------------------------------------------
   */
  protected async handleRelatedDataSQL(batchId: string): Promise<any> {
    const [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE batch_id = ? AND type != ?",
      [batchId, this.type]
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
    const results = await this.storeConnection.observatoryEntry.findMany({
      where: { batch_id: batchId, type: { not: this.type } }
    });
    return this.groupItemsByType(results);
  }
  

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceKnex(filters: RedisFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const querySQL = query ? this.getInclusionSQL(query, "command") : "";

    const results = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'redis' ${querySQL}`)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .whereRaw(`type = 'redis' ${querySQL}`)
      .count()
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByInstanceSQL(filters: RedisFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const querySQL = query ? this.getInclusionSQL(query, "command") : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries 
       WHERE type = 'redis' ${querySQL} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) as total 
       FROM observatory_entries 
       WHERE type = 'redis' ${querySQL}`
    );

    return { results, count: countResult[0].total > 999 ? (countResult[0].total / 1000).toFixed(2) + "K" : countResult[0].total };
  }

  protected async getIndexTableDataByInstanceMongodb(filters: RedisFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "redis",
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
        type: "redis",
        ...queryFilter
      });

    return { results, count: count > 999 ? (count / 1000).toFixed(2) + "K" : count };
  }

  protected async getIndexTableDataByInstancePrisma(filters: RedisFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...queryFilter,
        type: "redis"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit 
    });

    return { results, count: results.length };
  }

  protected async getIndexTableDataByInstanceTypeorm(filters: RedisFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...queryFilter,
        type: "redis"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit 
    });

    return { results, count: results.length };
  }

  protected async getIndexTableDataByInstanceSequelize(filters: RedisFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...queryFilter,
        type: "redis"
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
  protected async getIndexTableDataByGroupKnex(filters: RedisFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";
    const querySQL = query ? this.getInclusionSQL(query, "command") : "";

    const results = await this.storeConnection("observatory_entries")
      .select(
        this.storeConnection.raw("JSON_UNQUOTE(JSON_EXTRACT(content, '$.command')) as command")
      )
      .count("* as total")
      .avg(this.storeConnection.raw("CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,6)) as duration"))
      .whereRaw(`type = 'redis' ${periodSQL} ${querySQL}`)
      .groupBy("command")
      .orderBy("total", "desc")
      .limit(limit)
      .offset(offset);

    const count = await this.storeConnection("observatory_entries")
      .countDistinct(this.storeConnection.raw("JSON_UNQUOTE(JSON_EXTRACT(content, '$.command'))"))
      .whereRaw(`type = 'redis' ${periodSQL} ${querySQL}`)
      .first();

    return { results, count: count?.count || 0 };
  }

  protected async getIndexTableDataByGroupSQL(filters: RedisFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "command") : "";

    const [results] = await this.storeConnection.query(
      `SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.command')) as command,
        COUNT(*) as total,
        AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,6))) as duration
        FROM observatory_entries
        WHERE type = 'redis' ${periodSql} ${querySql}
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.command'))
        ORDER BY total DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.command'))) as total
       FROM observatory_entries
       WHERE type = 'redis' ${periodSql} ${querySql}`
    );

    return { results, count: countResult[0].total > 999 ? (countResult[0].total / 1000).toFixed(2) + "K" : countResult[0].total };
  }

  protected async getIndexTableDataByGroupMongodb(filters: RedisFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .aggregate([
        {
          $match: {
            type: "redis",
            ...timeFilter,
            ...queryFilter
          }
        },
        {
          $group: {
            _id: "$command",
            command: { $first: "$command" },
            total: { $sum: 1 },
            duration: { $avg: "$duration" }
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
      .distinct("command", {
        type: "redis",
        ...timeFilter,
        ...queryFilter
      });

    return { results, count: count.length };
  }

  protected async getIndexTableDataByGroupPrisma(filters: RedisFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,  
        ...queryFilter,
        type: "redis"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit   
    });

    return { results, count: results.length };
  }

  protected async getIndexTableDataByGroupTypeorm(filters: RedisFilters): Promise<any> {
    const { period, limit, offset, query } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        ...queryFilter,
        type: "redis"
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit 
    });

    return { results, count: results.length };
  }

  protected async getIndexTableDataByGroupSequelize(filters: RedisFilters): Promise<any> {
    const { limit, offset, query } = filters;
    const queryFilter = query ? { command: { $regex: query, $options: 'i' } } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {  
        ...queryFilter,
        type: "redis"
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
  protected async getIndexGraphDataKnex(filters: RedisFilters): Promise<any> {
    const { period } = filters;
    const periodSQL = period ? this.getPeriodSQL(period) : "";

    const results = await this.storeConnection("observatory_entries")
      .select(
        this.storeConnection.raw("COUNT(*) as total"),
        this.storeConnection.raw("MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as shortest"),
        this.storeConnection.raw("MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as longest"),
        this.storeConnection.raw("AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as average")
      )
      .whereRaw(`type = 'redis' ${periodSQL}`);

    const timeData = await this.storeConnection("observatory_entries")
      .select("created_at", "content")
      .whereRaw(`type = 'redis' ${periodSQL}`)
      .orderBy("created_at", "desc");

    const countFormattedData = this.countGraphData(timeData, period as string);
    const durationFormattedData = this.durationGraphData(timeData, period as string);
    const aggregateResults = results[0];

    return {
      results: timeData,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataSQL(filters: RedisFilters): Promise<any> {
    const { period } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as shortest,
          MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as longest,
          AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL(10,2))) as average,
          NULL as created_at,
          NULL as content,
          'aggregate' as type
        FROM observatory_entries
        WHERE type = 'redis' ${periodSql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'redis' ${periodSql}
        ORDER BY created_at DESC
      );`
    );

    const aggregateResults = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2)
    };
  }

  protected async getIndexGraphDataMongodb(filters: RedisFilters): Promise<any> {
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
            type: "redis",
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

    const commands = await this.storeConnection
      .db()
      .collection("observatory_entries")
      .find({
        type: "redis",
        ...timeFilter
      })
      .toArray();

    const countFormattedData = this.countGraphData(commands, period as string);
    const durationFormattedData = this.durationGraphData(commands, period as string);
    const aggregateResults = results[0] || { total: 0, shortest: 0, longest: 0, average: 0 };

    return {
      results: commands,
      countFormattedData,
      durationFormattedData,
      count: aggregateResults.total,
      shortest: parseFloat(aggregateResults.shortest || 0).toFixed(2),
      longest: parseFloat(aggregateResults.longest || 0).toFixed(2),
      average: parseFloat(aggregateResults.average || 0).toFixed(2)
    };
  }


  protected async getIndexGraphDataPrisma(filters: RedisFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      } 
    } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        type: "redis" 
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
    };
  }

  protected async getIndexGraphDataTypeorm(filters: RedisFilters): Promise<any> {
    const { period } = filters;
    const timeFilter = period ? {
      created_at: {
        $gte: new Date(Date.now() - this.periods[period] * 60 * 1000)
      }
    } : {};

    const results = await this.storeConnection.observatoryEntry.findMany({
      where: {
        ...timeFilter,
        type: "redis"
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
    };
  }

  protected async getIndexGraphDataSequelize(filters: RedisFilters): Promise<any> {
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

    const groupedData = Array.from({ length: 120 }, () => ({
      total: 0,
      gets: 0,
      sets: 0,
      deletes: 0,
    }));

    data.forEach((redis: any) => {
      const redisTime = new Date(redis.created_at).getTime();
      const command = redis.content.command.toLowerCase();
      const intervalIndex = Math.floor(
        (redisTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex].total++;
        if (command.startsWith('get')) {
          groupedData[intervalIndex].gets++;
        } else if (command.startsWith('set')) {
          groupedData[intervalIndex].sets++;
        } else if (command.startsWith('del')) {
          groupedData[intervalIndex].deletes++;
        }
      }
    });

    return groupedData.map((entry, index) => ({
      ...entry,
      label: `${Math.floor((index * intervalDuration) / 60)}h`,
    }));
  }

  protected extractFiltersFromRequest(req: Request): RedisFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      index: req.query.index as "instance" | "group",
      status: req.query.status as string,
    };
  }
}

export default RedisWatcher;

