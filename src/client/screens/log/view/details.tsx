import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { timeAgo } from '@/utils.js'
import { LogInstanceResponse } from '../../../../../types'

export default function Details({ data }: { data: { log: LogInstanceResponse } }) {
  const LOG_LEVELS = [
    { dataKey: "info", variant: "secondary" },
    { dataKey: "warn", variant: "warning" },
    { dataKey: "error", variant: "error" },
    { dataKey: "debug", variant: "debug" },
    { dataKey: "trace", variant: "trace" },
    { dataKey: "fatal", variant: "error" },
    { dataKey: "log", variant: "log" },
  ];

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Time</div>
            <div className="col-span-9">
              {new Date(data.log.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              ({timeAgo(data.log.created_at)})
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Level</div>
            <div className="col-span-9">
              <Badge
                variant={LOG_LEVELS.find((level) => level.dataKey === data.log.content.level)?.variant as "secondary" | "warning" | "error" | "debug" | "trace" | "log" | "default" | "destructive" | "outline" | "success" | null | undefined}
              >
                {data.log.content.level.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Message</div>
            <div className="col-span-9">{data.log.content.message}</div>
          </div>
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">File</div>
            <div className="col-span-9">
              {data.log.content.file}:{data.log.content.line}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}