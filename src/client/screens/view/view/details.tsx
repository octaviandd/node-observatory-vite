import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDuration, getSize, timeAgo } from '@/utils.js';
import { ViewInstanceResponse } from '../../../../../types';

export default function Details({ view }: { view: ViewInstanceResponse }) {
  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>View Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Time</div>
            <div className="col-span-9">
              {new Date(view.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              ({timeAgo(view.created_at)})
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Status</div>
            <div className="col-span-9">
              <Badge
                variant={view.content.status === "completed" ? "secondary" : "destructive"}
              >
                {view.content.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">View</div>
            <div className="col-span-9">{view.content.view}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Cache</div>
            <div className="col-span-9">
              {view.content.cacheInfo.cacheEnabled ? (
                <Badge variant="secondary">ENABLED</Badge>
              ) : (
                <Badge variant="warning">DISABLED</Badge>
              )}
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Duration</div>
            <div className="col-span-9">
              {formatDuration(view.content.duration)}
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Size</div>
            <div className="col-span-9">
              {getSize(view.content.size)}
            </div>
          </div>

          {view.content.error && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-muted-foreground">Error</div>
              <div className="col-span-9 text-red-500">
                {view.content.error.message}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}