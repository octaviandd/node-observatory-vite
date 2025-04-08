/** @format */

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type TimelineEvent = {
  type: string;
  time: string;
  duration: number;
  description: string;
};

type Props = {
  events: TimelineEvent[];
};

export const RequestPreviewTimeline = React.memo(({ events }: Props) => {
  const formatDuration = (ms: number): string => {
    return ms > 999 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <h3 className="text-xl font-medium">Timeline</h3>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-8">
            {events.map((event, index) => (
              <div key={index} className="flex gap-4 relative">
                <div className="w-[2px] bg-border absolute top-10 bottom-0 left-[7px]" />
                <div className="w-4 h-4 rounded-full bg-muted-foreground mt-2" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{event.type}</div>
                    <Badge variant="outline">
                      {formatDuration(event.duration)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
