/** @format */

import React from "react";
import { JobInstanceResponse } from "../../../../../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react";

export const JobPreviewCrumbs = React.memo(({ job }: { job: JobInstanceResponse }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "secondary";
      case "released":
        return "warning";
      default:
        return "destructive";
    }
  };

  return (
    <Card className="border-none">
      <CardContent className="p-6">
        <div className="flex flex-col gap-y-4">
          <Breadcrumb className="flex items-center gap-x-4">
            <BreadcrumbItem>
              <BreadcrumbLink href="/jobs" className="text-muted-foreground">Jobs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem className="text-muted-foreground px-2">
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink className="text-muted-foreground">{job.content.queue}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <div className="flex items-center gap-x-4">
            <Badge variant="secondary" className="text-sm">
              {job.content.jobId} (ID)
            </Badge>
            <Badge variant={getStatusColor(job.content.status)}>
              {job.content.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
