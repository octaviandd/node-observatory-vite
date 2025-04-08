/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { QueryInstanceResponse } from "../../../../../types";

export const QueryCrumbs = React.memo(({ query }: { query: QueryInstanceResponse }) => {
  const getStatusColor = (sqlType: string) => {
    if (sqlType === "SELECT") return "secondary";
    if (sqlType === "INSERT") return "secondary";
    if (sqlType === "UPDATE") return "secondary";
    if (sqlType === "DELETE") return "destructive";
    return "secondary";
  };

  return (
    <Card className="">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/queries" className="text-muted-foreground">Queries</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-4">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{query.content.database}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{query.content.package.toUpperCase()}</Badge>
          <Badge variant={getStatusColor(query.content.sqlType)}>
            {query.content.sqlType}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
