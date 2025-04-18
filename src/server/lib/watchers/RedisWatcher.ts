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

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
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

