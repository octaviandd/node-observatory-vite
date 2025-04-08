/** @format */
import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const RequestPreviewDetails = React.memo(
  ({
    queries,
    jobs,
    caches,
    https,
    exceptions,
    views,
    models,
  }: {
    queries: any[];
    jobs: any[];
    caches: any[];
    https: any[];
    exceptions: any[];
    views: any[];
    models: any[];
  }) => {
    const filterByType = (data: any[], type: string) =>
      data.filter((item: any) => item.type === type);
    const sumOf = (items: any[], pluck: (item: any) => number) =>
      items.reduce((acc, item) => acc + pluck(item), 0);
    const averageOf = (items: any[], pluck: (item: any) => number) =>
      !items.length ? 0 : sumOf(items, pluck) / items.length;

    const queryItems = filterByType(queries, "query");

    const stats = {
      queryCount: queryItems.length,
      queryAverage: averageOf(queryItems, (item) => item.content.duration),
      queryWrites: sumOf(queryItems, (item) => item.content.status !== 'failed' && (item.content.sqlType === 'WRITE' || item.content.sqlType === 'INSERT' || item.content.sqlType === 'UPDATE' || item.content.sqlType === 'DELETE') ? 1 : 0),
      queryReads: sumOf(queryItems, (item) => item.content.status !== 'failed' && (item.content.sqlType === 'SELECT' || item.content.sqlType === 'SHOW') ? 1 : 0),
      httpCount: filterByType(https, "http").length,
      jobCount: filterByType(jobs, "job").length,
      cacheHits: sumOf(caches, (item) => item.content.hits ? 1 : 0),
      cacheMisses: sumOf(caches, (item) => item.content.misses ? 1 : 0),
      cacheWrites: sumOf(caches, (item) => item.content.writes ? 1 : 0),
      exceptionCount: filterByType(exceptions, "exception").length,
      viewCount: filterByType(views, "view").length,
      modelCount: filterByType(models, "model").length,
    };

    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium">Details</h3>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Queries</span>
            <span>{stats.queryCount} / {stats.queryAverage > 999 ? (stats.queryAverage / 1000).toFixed(2) + "s" : stats.queryAverage.toFixed(2) + "ms"}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Outgoing Requests</span>
            <span>{stats.httpCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Queued Jobs</span>
            <span>{stats.jobCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Storage</span>
            <span>{stats.queryReads} reads / {stats.queryWrites} writes</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Cache</span>
            <span>{stats.cacheHits} Hits / {stats.cacheMisses} Misses / {stats.cacheWrites} Writes</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Exceptions</span>
            <span>{stats.exceptionCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Views</span>
            <span>{stats.viewCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Models</span>
            <span>{stats.modelCount}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
);
