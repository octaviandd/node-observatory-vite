/** @format */

import React from "react";
import { CacheInstanceResponse } from "../../../../../types";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export const CacheCrumbs = React.memo(({ cache }: { cache: CacheInstanceResponse }) => {
  return (
    <Card>
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb className="flex items-center gap-x-4">
          <BreadcrumbItem>
            <BreadcrumbLink href="/caches" className="text-muted-foreground">
              Caches
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">
              {cache.content.key}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{cache.content.package.toUpperCase()}</Badge>
          <Badge variant={cache.content.misses ? "destructive" : cache.content.writes ? "warning" : "secondary"}>
            {cache.content.misses ? "MISS" : cache.content.writes ? "WRITE" : "HIT"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});
