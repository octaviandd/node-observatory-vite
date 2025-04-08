/** @format */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { formatDate, formatDuration } from "@/utils.js";
import { ScheduleInstanceResponse } from "../../../../../types";

type Props = {
  data: ScheduleInstanceResponse[];
  handleSidePanel: (uuid: string, requestId: string, jobId: string, scheduleId: string) => void;
  children: React.ReactNode;
};

export const InstanceTable = React.memo(({ data, handleSidePanel, children }: Props) => {
  const getStatusVariant = (status: string) => {
    if (status === "completed") return "secondary";
    if (status === "failed") return "destructive";
    return "error";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead>Job ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            {/* <TableHead className="w-[100px]"></TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((schedule: ScheduleInstanceResponse) => (
            <TableRow key={schedule.uuid} className={!schedule.content.status ? "bg-red-800/20" : ""}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(schedule.created_at)}
              </TableCell>
              <TableCell className="text-black dark:text-white">
                {schedule.content.jobId}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(schedule.content.status)}>
                  {schedule.content.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <p className={schedule.content.duration && schedule.content.duration > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {schedule.content.duration ? formatDuration(schedule.content.duration) : "N/A"}
                </p>
              </TableCell>
              {/* <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSidePanel(schedule.uuid, schedule.request_id ?? '', schedule.job_id ?? '', schedule.schedule_id ?? '')}
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/schedule/${schedule.uuid}`}>
                    <Button variant="outline" size="icon">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
              </TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {children}
    </div>
  );
});
