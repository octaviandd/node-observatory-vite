import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface LogFilters extends WatcherFilters {
  logType:
    | "All"
    | "Info"
    | "Warn"
    | "Error"
    | "Debug"
    | "Trace"
    | "Fatal"
    | "Complete"
    | "Log";
  key?: string;
  index: "instance" | "group";
}

class LogWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "log";

  /**
   * Constructor & Initialization
   * --------------------------------------------------------------------------
   */
  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  /**
   * Query Builder Methods
   * --------------------------------------------------------------------------
   */
  private getLogTypeSQL(logType: string): string {
    const types = logType.split(",");
    return types.map(type => `JSON_EXTRACT(content, '$.level') LIKE '%${type.toLowerCase()}%'`)
      .join(" OR ");
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
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */

  protected async getIndexTableDataByInstanceSQL(filters: LogFilters): Promise<any> {
    const { limit, offset, logType, query, key, period } = filters;
    const typeSql = logType.toLowerCase() === "all" ? "" : `AND ${this.getLogTypeSQL(logType)}`;
    const querySql = query ? this.getInclusionSQL(query, "message") : "";
    const messageSql = key ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) = '${key}'` : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'log' ${typeSql} ${querySql} ${messageSql} ${periodSql}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    ) as [any[]];

    const [countResults] = await this.storeConnection.query(
      `SELECT COUNT(*) as total FROM observatory_entries
       WHERE type = 'log' ${typeSql} ${querySql} ${messageSql} ${periodSql}`
    ) as [any[]];

    console.log(results)

    return { results, count: this.formatValue(countResults[0].total, true) };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */

  protected async getIndexTableDataByGroupSQL(filters: LogFilters): Promise<any> {
    const { limit, offset, query, period } = filters;
    const querySql = query ? this.getInclusionSQL(query, "message") : "";
    const periodSql = period ? this.getPeriodSQL(period) : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
      JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) as message,
      COUNT(*) as total,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'info' THEN 1 ELSE 0 END) as info,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'warn' THEN 1 ELSE 0 END) as warn,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'error' THEN 1 ELSE 0 END) as error,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'debug' THEN 1 ELSE 0 END) as debug,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'trace' THEN 1 ELSE 0 END) as trace,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'fatal' THEN 1 ELSE 0 END) as fatal,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'log' THEN 1 ELSE 0 END) as log
      FROM observatory_entries
      WHERE type = 'log' ${querySql} ${periodSql}
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.message'))
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}`
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.message'))) as total
       FROM observatory_entries
       WHERE type = 'log' ${querySql} ${periodSql}`
    )) as [any];

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataSQL(filters: LogFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const messageSql = key ? `AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.message')) = '${key}'` : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'info' THEN 1 ELSE 0 END) as info,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'warn' THEN 1 ELSE 0 END) as warn,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'error' THEN 1 ELSE 0 END) as error,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'debug' THEN 1 ELSE 0 END) as debug,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'trace' THEN 1 ELSE 0 END) as trace,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'fatal' THEN 1 ELSE 0 END) as fatal,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.level')) LIKE 'log' THEN 1 ELSE 0 END) as log,
          NULL as created_at,
          NULL as content,
          NULL as uuid,
          NULL as type,
          NULL as request_id,
          NULL as job_id,
          NULL as schedule_id,
          'aggregate' as row_type
        FROM observatory_entries
        WHERE type = 'log' ${periodSql} ${messageSql}
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as info,
          NULL as warn,
          NULL as error,
          NULL as debug,
          NULL as trace,
          NULL as fatal,
          NULL as log,
          created_at,
          content,
          uuid,
          type,
          request_id,
          job_id,
          schedule_id,
          'row' as row_type
        FROM observatory_entries
        WHERE type = 'log' ${periodSql} ${messageSql}
        ORDER BY created_at DESC
      );`
    );

    const aggregateResults : {
      total: number;
      info: number;
      warn: number;
      error: number;
      debug: number;
      trace: number;
      fatal: number;
      log: number;
    } = results.shift();
    const countFormattedData = this.countGraphData(results, period as string);

    return {
      results,
      countFormattedData,
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.info, true),
      indexCountTwo: this.formatValue(aggregateResults.warn, true),
      indexCountThree: this.formatValue(aggregateResults.error, true),
      indexCountFive: this.formatValue(aggregateResults.debug, true),
      indexCountSix: this.formatValue(aggregateResults.trace, true),
      indexCountSeven: this.formatValue(aggregateResults.fatal, true),
      indexCountEight: this.formatValue(aggregateResults.log, true),
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

    const groupedData = Array.from({ length: 120 }, (_, index) => ({
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
      trace: 0,
      fatal: 0,
      log: 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((log: any) => {
      const logTime = new Date(log.created_at).getTime();
      const level = log.content.level;

      // Calculate which interval the log falls into
      const intervalIndex = Math.floor(
        (logTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          //@ts-ignore
          [level]: groupedData[intervalIndex][level] + 1,
        };
      }
    });

    return groupedData;
  }

  protected durationGraphData(data: any, period: string) {
    // Logs don't have duration data
    return [];
  }

  protected extractFiltersFromRequest(req: Request): LogFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      query: req.query.q as string,
      isTable: req.query.table === "true",
      logType: req.query.status as LogFilters["logType"],
      index: req.query.index as "instance" | "group",
      key: req.query.key as string
    };
  }
}

export default LogWatcher;
