import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration, timeAgo } from '@/utils.js'
import { QueryInstanceResponse } from '../../../../../types'

export default function Details({ query }: { query: QueryInstanceResponse }) {
  return (
    <Card className="rounded-none shadow-xs">
      <CardHeader>
        <CardTitle>Query Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Time</div>
            <div className="col-span-9 text-sm">
              {new Date(query.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "numeric",
                second: "numeric",
                hour12: false,
              }).replace(",", "")}
              <span className="text-xs text-muted-foreground ml-2">
                ({timeAgo(query.created_at)})
              </span>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-sm text-muted-foreground">Status</div>
            <div className="col-span-9">
              <Badge
                variant={query.content.status === 'failed' ? 'destructive' : 'secondary'}
              >
                {query.content.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {query.content.duration !== undefined && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">Duration</div>
              <div className="col-span-9 text-sm">
                {formatDuration(query.content.duration)}
              </div>
            </div>
          )}

          {query.content.package && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">Package</div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">{query.content.package}</Badge>
              </div>
            </div>
          )}


          {query.content.sqlType && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">SQL Type</div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">{query.content.sqlType}</Badge>
              </div>
            </div>
          )}

          {query.content.sql && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">SQL Type</div>
              <div className="col-span-9">
                <Badge variant="secondary" className="capitalize">{query.content.sql}</Badge>
              </div>
            </div>
          )}

          {query.content.hostname && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">Host</div>
              <div className="col-span-9 text-sm">{query.content.hostname}</div>
            </div>
          )}

          {query.content.port && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">Port</div>
              <div className="col-span-9">
                <Badge variant="outline">{query.content.port}</Badge>
              </div>
            </div>
          )}

          {query.content.database && (
            <div className="grid items-center grid-cols-12">
              <div className="col-span-3 text-sm text-muted-foreground">Database</div>
              <div className="col-span-9 text-sm">{query.content.database}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}