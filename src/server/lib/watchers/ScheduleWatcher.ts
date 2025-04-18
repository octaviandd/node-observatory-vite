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

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */

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
