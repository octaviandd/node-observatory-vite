/** @format */
import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const JobPreviewDetails = React.memo(
  ({
    queries,
    caches,
    https,
    notifications,
    mails,
    logs,
    exceptions,
  }: {
    queries: any[];
    caches: any[];
    https: any[];
    notifications: any[];
    mails: any[];
    logs: any[];
    exceptions: any[];
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
      httpCount: filterByType(https, "http").length,
      notificationCount: filterByType(notifications, "notification").length,
      queryWrites: filterByType(queries, "write").length,
      queryReads: filterByType(queries, "read").length,
      cacheHits: sumOf(caches, (item) => !item.content.hasMissed ? 1 : 0),
      cacheMisses: sumOf(caches, (item) => item.content.hasMissed ? 1 : 0),
      mailCount: mails.length,
      logCount: logs.length,
      exceptionCount: exceptions.length,
    };

    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium">Meta-data</h3>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Queries</span>
            <span>
              {stats.queryCount > 999 ? (stats.queryCount / 1000).toFixed(2) + "k" : stats.queryCount} / {
                stats.queryCount ? 
                  stats.queryAverage > 999 ? 
                    (stats.queryAverage / 1000).toFixed(2) + "s" : 
                    stats.queryAverage.toFixed(2) + "ms" : 
                  "0ms"
              }
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Outgoing Requests</span>
            <span>{stats.httpCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Notifications</span>
            <span>{stats.notificationCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Storage</span>
            <span>{stats.queryReads} reads / {stats.queryWrites} writes</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Cache</span>
            <span>{stats.cacheHits} Hits / {stats.cacheMisses} Misses</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Mails</span>
            <span>{stats.mailCount}</span>
          </div>
          <Separator /> 
          <div className="flex justify-between items-center"> 
            <span className="text-sm text-muted-foreground uppercase">Logs</span>
            <span>{stats.logCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Exceptions</span>
            <span>{stats.exceptionCount}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
);
