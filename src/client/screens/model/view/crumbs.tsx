/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { ModelInstanceResponse } from "../../../../../types";

export const ModelCrumbs = React.memo(({ model }: { model: ModelInstanceResponse }) => {
  const getStatusColor = (status: string) => {
    if (status === "completed") return "secondary";
    if (status === "failed") return "destructive";
    return "secondary";
  };

  return (
    <Card className="rounded-sm">
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/models" className="text-muted-foreground">Models</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{model.content.modelName}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{model.content.package.toUpperCase()}</Badge>
          <Badge variant={getStatusColor(model.content.status)}>
            {model.content.status.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
