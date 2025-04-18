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

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
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

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
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
