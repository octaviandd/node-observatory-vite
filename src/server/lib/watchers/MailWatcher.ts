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
  protected async getIndexTableDataByInstanceSQL(filters: MailFilters): Promise<any> {
    const { limit, offset, status, key, query } = filters;
    const statusSql = status ? this.getStatusSQL(status) : "";
    const mailToSql = key ? this.getInclusionSQL(key, "to") : "";
    const querySql = query ? this.getInclusionSQL(query, "subject") : "";

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

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
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
