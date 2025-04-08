/** @format */

import React from "react";
import { CacheInstanceResponse } from "../../../../../types";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/utils.js";
import { formatDuration } from "@/utils.js";

export const CachePreviewInfo = React.memo(({ cache }: { cache: CacheInstanceResponse }) => {
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
              {new Date(cache.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              ({timeAgo(cache.created_at)})
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Status</div>
            <div className="col-span-9">
              <Badge
                variant={cache.content.misses ? "destructive" : cache.content.writes ? "warning" : "secondary"}
              >
                {cache.content.misses ? "MISS" : cache.content.writes ? "WRITE" : "HIT"}
              </Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Duration</div>
            {/* <div className="col-span-9">{formatDuration(cache.content.duration)}</div> */}
          </div>


          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Check Period</div>
            <div className="col-span-9">{cache.content.checkPeriod} seconds</div>
          </div>

          {cache.content.stdTTL && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Time to Live</div>
              <div className="col-span-9">{cache.content.stdTTL}</div>
            </div>
          )}

          {cache.content.key && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Key</div>
              <div className="col-span-9 font-mono text-sm break-all">{cache.content.key}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
