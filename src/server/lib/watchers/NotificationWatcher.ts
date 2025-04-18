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

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
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
