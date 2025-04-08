/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { NotificationInstanceResponse } from "../../../../../types";

export const NotificationCrumbs = React.memo(({ notification }: { notification: NotificationInstanceResponse }) => {
  const getStatusColor = (status: string) => {
    if (status === "completed") return "secondary";
    if (status === "failed") return "destructive";
    return "warning";
  };

  return (
    <Card className="rounded-sm">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/notifications" className="text-muted-foreground">Notifications</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-4">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{notification.content.channel}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{notification.content.package.toUpperCase()}</Badge>
          <Badge variant={getStatusColor(notification.content.status)}>
            {notification.content.status.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
