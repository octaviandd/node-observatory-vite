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

   /**
   * Table Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */

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

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
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
