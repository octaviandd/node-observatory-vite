/** @format */

import { Request } from "express";
import { StoreDriver, HttpRequestData } from "../../../../types";
import { BaseWatcher } from "./BaseWatcher";
import { WatcherFilters } from "./Watcher";
import { standardizeHttpRequestData } from "../utils";

interface HTTPClientFilters extends WatcherFilters {
  key?: string;
  index: "instance" | "group";
  status: "all" | "2xx" | "4xx" | "5xx";
}

class HTTPClientWatcher extends BaseWatcher {
  /**
   * Constants
   * --------------------------------------------------------------------------
   */
  readonly type = "http";

  /**
   * Constructor & Initialization
   * --------------------------------------------------------------------------
   */
  constructor(storeDriver: StoreDriver, storeConnection: any, redisClient: any) {
    super(storeDriver, storeConnection, redisClient);
  }

  private getStatusSQL(status: string): string {
    return status === "all"
      ? ""
      : `AND JSON_EXTRACT(content, '$.statusCode') LIKE '${status.replace('xx', '%')}'`;
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

  protected async getIndexTableDataByInstanceSQL(filters: HTTPClientFilters): Promise<any> {
    const { period, query, status, key, limit, offset } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "origin") : "";
    const statusSql = this.getStatusSQL(status);
    const keySql = key ? this.getInclusionSQL(key, "origin") : "";

    const [results] = await this.storeConnection.query(
      `SELECT * FROM observatory_entries
       WHERE type = 'http' ${periodSql} ${querySql} ${statusSql} ${keySql}
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}` 
    );
    
    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(*) AS total FROM observatory_entries
       WHERE type = 'http' ${periodSql} ${querySql} ${statusSql} ${keySql}
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  /**
   * Group Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexTableDataByGroupSQL(filters: HTTPClientFilters): Promise<any> {
    const { period, query, key, limit, offset } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const querySql = query ? this.getInclusionSQL(query, "request.url") : "";
    const keySql = key ? this.getEqualitySQL(key, 'request.url') : "";


    const [results] = await this.storeConnection.query(
      `SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content, '$.origin')) AS url,
        COUNT(*) AS total,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '2%' THEN 1 ELSE 0 END) AS count_200,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '4%' THEN 1 ELSE 0 END) AS count_400,
        SUM(CASE WHEN JSON_EXTRACT(content, '$.statusCode') LIKE '5%' THEN 1 ELSE 0 END) AS count_500,
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
        WHERE type = 'http' ${periodSql} ${querySql} ${keySql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(content, '$.origin'))
        ORDER BY total DESC
        LIMIT ${limit} OFFSET ${offset}`
    );

    const [countResult] = await this.storeConnection.query(
      `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(content, '$.origin'))) as total 
       FROM observatory_entries 
       WHERE type = 'http' ${periodSql} ${querySql} ${keySql}
       AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'`
    );

    return { results, count: this.formatValue(countResult[0].total, true) };
  }

  /**
   * Graph Data Methods
   * --------------------------------------------------------------------------
   */
  protected async getIndexGraphDataSQL(filters: HTTPClientFilters): Promise<any> {
    const { period, key } = filters;
    const periodSql = period ? this.getPeriodSQL(period) : "";
    const keySql = key ? this.getInclusionSQL(key, 'origin') : "";

    const [results] = await this.storeConnection.query(
      `(
        SELECT
          COUNT(*) as total,
          MIN(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as shortest,
          MAX(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as longest,
          AVG(CAST(JSON_EXTRACT(content, '$.duration') AS DECIMAL)) as average,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '2%' OR JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '3%' THEN 1 ELSE 0 END) as count_200,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '4%' THEN 1 ELSE 0 END) as count_400,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) LIKE '5%' THEN 1 ELSE 0 END) as count_500,
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
        WHERE type = 'http' ${periodSql} ${keySql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
      )
      UNION ALL
      (
        SELECT
          NULL as total,
          NULL as shortest,
          NULL as longest,
          NULL as average,
          NULL as p95,
          NULL as count_200,
          NULL as count_400,
          NULL as count_500,
          created_at,
          content,
          'row' as type
        FROM observatory_entries
        WHERE type = 'http' ${periodSql} ${keySql}
        AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.statusCode')) != '0'
        ORDER BY created_at DESC
      );`
    );

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
      count: this.formatValue(aggregateResults.total, true),
      indexCountOne: this.formatValue(aggregateResults.count_200, true),
      indexCountTwo: this.formatValue(aggregateResults.count_400, true),
      indexCountThree: this.formatValue(aggregateResults.count_500, true),
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
      "200": 0,
      "400": 0,
      "500": 0,
      label: this.getLabel(index, period)
    }));

    data.forEach((request: any) => {
      if(request.content.statusCode === 0) return;
      const requestTime = new Date(request.created_at).getTime();
      const statusCode = Math.floor(request.content.statusCode / 100) * 100;
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

  protected extractFiltersFromRequest(req: Request): HTTPClientFilters {
    return {
      period: req.query.period as "1h" | "24h" | "7d" | "14d" | "30d",
      query: req.query.q as string,
      isTable: req.query.table === "true",
      offset: parseInt(req.query.offset as string, 10) || 0,
      limit: parseInt(req.query.limit as string, 10) || 20,
      index: req.query.index as "instance" | "group",
      status: req.query.status as "all" | "2xx" | "4xx" | "5xx",
      key: req.query.key ? decodeURIComponent(req.query.key as string) : undefined,
    };
  }
  
  /**
   * Add content to the watcher
   * --------------------------------------------------------------------------
   */
  async addContent(content: { [key: string]: any }): Promise<void> {
    // Standardize the HTTP request data to ensure consistent structure
    const standardizedContent = standardizeHttpRequestData(content);
    await super.addContent(standardizedContent);
  }

  /**
   * Get a list of HTTP requests with standardized data
   * This is useful for displaying in tables or lists
   *
   * @param limit Maximum number of requests to return
   * @param offset Pagination offset
   * @param filters Optional filters to apply
   * @returns Array of standardized HTTP request data
   */
  async getStandardizedRequests(
    limit: number = 20,
    offset: number = 0,
    filters: Partial<HTTPClientFilters> = {}
  ): Promise<HttpRequestData[]> {
    // Create default filters
    const defaultFilters: HTTPClientFilters = {
      period: '24h',
      offset,
      limit,
      status: 'all',
      index: 'instance',
      isTable: true
    };

    try {
    // Merge with provided filters
      const mergedFilters = { ...defaultFilters, ...filters };

      // Get raw data based on store driver
      let results: any[] = [];

      switch (this.storeDriver) {
        case 'mysql2':
          const data = await this.getIndexTableDataByInstanceSQL(mergedFilters);
          results = data.results || [];
          break;
        default:
          throw new Error(`Unsupported store driver: ${this.storeDriver}`);
      }

      // Standardize each result
      return results.map(item => {
        let content: any;

        try {
          // Parse content if it's a string
          content = typeof item.content === 'string'
            ? JSON.parse(item.content)
            : item.content;
        } catch (error: any) {
          console.error(`Failed to parse HTTP request data: ${error.message}`);
          content = {};
        }

        // Add metadata from the database record
        content.uuid = item.uuid;
        content.created_at = item.created_at;
        content.requestId = item.request_id;
        content.jobId = item.job_id;
        content.scheduleId = item.schedule_id;

        // Standardize the data
        return standardizeHttpRequestData(content);
      });
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}

export default HTTPClientWatcher;
