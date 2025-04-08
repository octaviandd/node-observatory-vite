/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { RequestInstanceResponse } from "../../../../../types";

export const RequestCrumbs = React.memo(({ request }: { request: RequestInstanceResponse }) => {
  const getStatusColor = (status: number) => {
    if (String(status).startsWith("2")) return "success";
    if (String(status).startsWith("3")) return "success";
    if (String(status).startsWith("4")) return "warning";
    return "destructive";
  };

  return (
    <Card className="">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb className="flex items-center gap-x-4">
          <BreadcrumbItem>
            <BreadcrumbLink href={`/requests`} className="text-muted-foreground">Requests</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{request.content.route}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{request.content.method.toUpperCase()}</Badge>
          <Badge variant={getStatusColor(request.content.statusCode)}>
            {request.content.statusCode}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
