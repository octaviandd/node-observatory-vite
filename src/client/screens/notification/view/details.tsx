import { Card, CardContent } from '@/components/ui/card'
import { NotificationInstanceResponse } from '../../../../../types'
import { timeAgo } from '@/utils.js'

export default function Details({ notification }: { notification: NotificationInstanceResponse }) {
  return (
    <Card className="rounded-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Time</div>
            <div className="col-span-9">
              {new Date(notification.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              <span className="text-muted-foreground">
                ({timeAgo(notification.created_at)})
              </span>
            </div>
          </div>
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Channel</div>
            <div className="col-span-9">{notification.content.channel}</div>
          </div>
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Event</div>
            <div className="col-span-9">{notification.content.event}</div>
          </div>
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Method</div>
            <div className="col-span-9">{notification.content.method}</div>
          </div>
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Duration</div>
            <div className="col-span-9">{notification.content.duration}</div>
          </div>
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Package</div>
            <div className="col-span-9">
              <span className="bg-muted px-2 py-1 rounded-md font-medium">
                {notification.content.package}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}