/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { ViewInstanceResponse } from "../../../../../types";

export const ViewCrumbs = React.memo(({ view }: { view: ViewInstanceResponse }) => {
  const getStatusColor = (status: string) => {
    if (status === 'completed') return "secondary";
    if (status === 'failed') return "destructive";
    return "warning";
  };

  return (
    <Card className="rounded-sm">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb className="flex items-center gap-x-4">
          <BreadcrumbItem>
            <BreadcrumbLink href="/views" className="text-muted-foreground">Views</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{view.content.view}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{view.content.package.toUpperCase()}</Badge>
          <Badge variant={getStatusColor(view.content.status)}>
            {view.content.status.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
