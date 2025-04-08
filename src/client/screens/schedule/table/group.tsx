/** @format */

import { AlertOctagon, CalendarCheck, CheckCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React from "react";
import { formatCount, formatDuration } from "@/utils.js";
import { ScheduleGroupResponse } from "../../../../../types";

export const GroupTable = React.memo(({ data, children }: { data: ScheduleGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Events</TableHead>
            <TableHead>Avg</TableHead>
            <TableHead>P95</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((schedule: ScheduleGroupResponse) => (
            <TableRow key={schedule.scheduleId}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  <span>{schedule.scheduleId}</span>
                  <span className="ml-3">{schedule.cronExpression}</span>
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {schedule.completed > 0 && (
                    <Badge variant="secondary" className="flex gap-1 items-center">
                      <CheckCircle className="h-3 w-3" />
                      {formatCount(schedule.completed)}
                    </Badge>
                  )}
                  {schedule.failed > 0 && (
                    <Badge variant="error" className="flex gap-1 items-center">
                      <AlertOctagon className="h-3 w-3" />
                      {formatCount(schedule.failed)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p className={schedule.average && schedule.average > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {schedule.average ? formatDuration(schedule.average) : "N/A"}
                </p>
              </TableCell>
              <TableCell>
                <p className={schedule.p95 && schedule.p95 > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {schedule.p95 ? formatDuration(schedule.p95) : "N/A"}
                </p>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(schedule.scheduleId)}`}>
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {children}
    </div>
  );
});
