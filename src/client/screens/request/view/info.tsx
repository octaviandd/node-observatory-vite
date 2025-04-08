/** @format */

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/utils.js";
import { RequestInstanceResponse } from "../../../../../types";

export const RequestPreviewInfo = React.memo(
  ({ request }: { request: RequestInstanceResponse }) => {
    const formatSize = (bytes: number): string => {
      if (!bytes) return '0B';
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    };

    const formatDuration = (ms: number): string => {
      if (!ms) return '0ms';
      return ms > 999 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
    };

    const formatMemory = (bytes: number): string => {
      return bytes > 999 ? `${(bytes / 1024 / 1024).toFixed(0)}MB` : `${bytes}B`;
    };

    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-5">
          <h3 className="text-xl font-medium">Info</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Time</span>
            <span>
              {new Date(request.created_at)
                .toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "numeric",
                  second: "numeric",
                  hour12: false,
                })
                .replace(",", "")}
              <span className="text-xs text-muted-foreground ml-2">
                ({timeAgo(request.created_at)})
              </span>
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Status</span>
            <span>{request.content.statusCode}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Duration</span>
            <span>{formatDuration(request.content.duration)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Request Size</span>
            <span>{formatSize(request.content.requestSize)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Response Size</span>
            <span>{formatSize(request.content.responseSize)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">Peak Memory</span>
            <span>{formatMemory(request.content.memoryUsage.rss)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
);
