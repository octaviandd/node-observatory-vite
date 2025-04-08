/** @format */

import React from "react";
import { HttpClientInstanceResponse } from "../../../../../types";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { formatDuration, getSize, timeAgo } from "@/utils.js";
import { Badge } from "@/components/ui/badge";

export const HTTPInfo = React.memo(({ http }: { http: HttpClientInstanceResponse }) => {

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Time</div>
            <div className="col-span-9">
              {new Date(http.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              ({timeAgo(http.created_at)})
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Status</div>
            <div className="col-span-9">
              <Badge
                variant={
                  String(http.content.statusCode).startsWith("2")
                    ? "secondary"
                    : String(http.content.statusCode).startsWith("3")
                      ? "warning"
                      : "destructive"
                }
              >
                {http.content.statusCode}
              </Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Method</div>
            <div className="col-span-9">
              <Badge variant="secondary">{http.content.method.toUpperCase()}</Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">URL</div>
            <div className="col-span-9">{http.content.fullUrl}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Duration</div>
            <div className="col-span-9">{formatDuration(http.content.duration)}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Response Size</div>
            <div className="col-span-9">{getSize(http.content.responseBodySize)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
