/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { HttpClientInstanceResponse } from "../../../../../types";

export const HTTPCrumbs = React.memo(({ http }: { http: HttpClientInstanceResponse }) => {
  const getStatusColor = (status: number) => {
    if (String(status).startsWith("2")) return "secondary";
    if (String(status).startsWith("3")) return "warning";
    return "destructive";
  };

  return (
    <Card className="rounded-sm">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/http" className="text-muted-foreground">HTTP</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{http.content.fullUrl}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{http.content.method.toUpperCase()}</Badge>
          <Badge variant={getStatusColor(http.content.statusCode)}>
            {http.content.statusCode}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
