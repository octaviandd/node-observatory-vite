

import { Request } from "express";
import { StoreDriver } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";

interface RequestFilters extends WatcherFilters {
  index: "instance" | "group";
  key?: string;
  status: "all" | "2xx" | "4xx" | "5xx";
};

class RequestWatcher extends BaseWatcher {
  readonly type = "request";

  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  /**
   * View Methods
   * --------------------------------------------------------------------------
   */
  protected async handleViewSQL(id: string): Promise<any> {
  const [results]: [any[], any] = await this.storeConnection.query(
    "SELECT * FROM observatory_entries WHERE uuid = ? OR request_id = (SELECT request_id FROM observatory_entries WHERE uuid = ?)",
    [id, id]
  );

  return this.groupItemsByType(results);
  }

  /**
   * Related Data Methods
   * --------------------------------------------------------------------------
   */
  protected async handleRelatedDataSQL(requestId: string): Promise<any> {
    const [results]: [any[], any] = await this.storeConnection.query(
      "SELECT * FROM observatory_entries WHERE request_id = ? AND type != 'request'",
      [requestId]
    );


    return this.groupItemsByType(results);
  }

  /**
   * Instance Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByInstanceSQL(filters: RequestFilters): Promise<any> {
    const { period, query, key, status, offset, limit } = filters;
    let routeSql = key ? this.getEqualitySQL(key, "route") : "";
    let querySql = query ? this.getInclusionSQL(query, "route") : "";
    let periodSql = period ? this.getPeriodSQL(period) : "";
    let statusSql = status ? this.getStatusSQL(status) : "";

    const [results] = (await this.storeConnection.query(
      `SELECT * FROM observatory_entries WHERE type = 'request' ${routeSql} ${querySql} ${periodSql} ${statusSql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    )) as [any[]];

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) AS total FROM observatory_entries WHERE type = 'request' ${routeSql} ${querySql} ${periodSql} ${statusSql} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    ) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  };

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(filters: RequestFilters): Promise<any> {
    const { period, key, query, offset, limit } = filters;
    let routeSQL = key ? this.getEqualitySQL(key, "route") : "";
    let timeSQL = period ? this.getPeriodSQL(period) : "";
    let querySQL = query ? this.getInclusionSQL(query, "route") : "";

    const [results] = (await this.storeConnection.query(
      `SELECT
      JSON_UNQUOTE(JSON_EXTRACT(content, '$.route')) as route,
      COUNT(*) as total,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400,
      SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500,
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
      CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average
      FROM observatory_entries
      WHERE type = 'request' ${routeSQL} ${timeSQL} ${querySQL}
      AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.route'))
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}`
    )) as [any];

    const [countResult] = (await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.route'))) as total FROM observatory_entries WHERE type = 'request' ${routeSQL} ${timeSQL} ${querySQL} AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    )) as [any[]];

    return { results, count: this.formatValue(countResult[0].total, true) };
  };

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataSQL(filters: RequestFilters): Promise<any> {
    const { period, key } = filters;
    const timeSql = period ? this.getPeriodSQL(period) : "";
    const routeSql = key ? this.getEqualitySQL(key, "route") : "";

    const [results] = (await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          CAST(MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as shortest,
          CAST(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as longest,
          CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(content, '$.duration')) AS DECIMAL(10,2))) AS DECIMAL(10,2)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500,
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
        WHERE type = 'request' ${routeSql} ${timeSql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as count_200,
          NULL as count_400,
          NULL as count_500,
          NULL as p95,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'request' ${routeSql} ${timeSql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
        ORDER BY created_at DESC
      );`
    )) as [any[], any];

    const aggregateResults: {
      total: number;
      shortest: string | null;
      longest: string | null;
      average: string | null;
      count_200: string | null;
      count_400: string | null;
      count_500: string | null;
      p95: string | null;
    } = results.shift();

    const countFormattedData = this.countGraphData(results, period as string);
    const durationFormattedData = this.durationGraphData(results, period as string);

    return {
      countFormattedData,
      durationFormattedData,
      indexCountOne: this.formatValue(aggregateResults.count_200, true),
      indexCountTwo: this.formatValue(aggregateResults.count_400, true),
      indexCountThree: this.formatValue(aggregateResults.count_500, true),
      count: this.formatValue(aggregateResults.total, true),
      shortest: this.formatValue(aggregateResults.shortest),
      longest: this.formatValue(aggregateResults.longest),
      average: this.formatValue(aggregateResults.average),
      p95: this.formatValue(aggregateResults.p95),
    };
  };

  /**
   * Helper Methods
   * --------------------------------------------------------------------------
   */

  private getStatusSQL(type: string) {
    if (type === "all") return "";
    return `AND JSON_EXTRACT(content, '$.statusCode') LIKE '${type[0]}%'`;
  }

  protected countGraphData(data: any, period: string) {
    const totalDuration = this.periods[period as keyof typeof this.periods]; // Total duration in minutes
    const intervalDuration = totalDuration / 120; // Duration of each bar in minutes

    const now = new Date().getTime(); // Current timestamp in ms
    const startDate = now - totalDuration * 60 * 1000; // Start time in ms

    // Initialize grouped data
    const groupedData = Array.from({ length: 120 }, (_, index: number) => ({
      "200": 0,
      "400": 0,
      "500": 0,
      label: this.getLabel(index, period)
    }));

    // Group requests into intervals
    data.forEach((request: any) => {
      if(request.content.statusCode === 0) return;
      const requestTime = new Date(request.created_at).getTime();
      const statusCode = Math.floor(request.content.statusCode / 100) * 100;

      // Calculate which interval the request falls into
      const intervalIndex = Math.floor(
        (requestTime - startDate) / (intervalDuration * 60 * 1000)
      );

      if (intervalIndex >= 0 && intervalIndex < 120) {
        groupedData[intervalIndex] = {
          ...groupedData[intervalIndex],
          //@ts-ignore
          [statusCode]: groupedData[intervalIndex][statusCode] + 1,
        };
      }
    });

    return groupedData;
  }

  protected extractFiltersFromRequest(req: Request): RequestFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      index: req.query.index as "instance" | "group",
      status: req.query.status as "all" | "2xx" | "4xx" | "5xx",
      key: req.query.key
        ? decodeURIComponent(req.query.key as string)
        : "",
    };
  }
}

export default RequestWatcher;
