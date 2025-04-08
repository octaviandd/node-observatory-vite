/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { ExceptionInstanceResponse } from "../../../../../types";

export const ExceptionCrumbs = React.memo(({ exception }: { exception: ExceptionInstanceResponse }) => {
  const getStatusColor = (type: string) => {
    if (type === "Error") return "destructive";
    return "secondary";
  };

  return (
    <Card className="rounded-sm">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/exceptions" className="text-muted-foreground">Exceptions</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{exception.content.title}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant={getStatusColor(exception.content.type)}>{exception.content.type}</Badge>
        </div>
      </CardContent>
    </Card>
  );
});