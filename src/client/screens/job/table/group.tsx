/** @format */

import { AlertCircle, AlertOctagon, ArrowUpDown, CheckCircle, ExternalLink, Layers } from "lucide-react";
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
import { JobGroupResponse } from "../../../../../types";

type Props = {
  data: JobGroupResponse[];
  children: React.ReactNode;
};

export const GroupTable = React.memo(({ data, children }: Props) => {
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
          {data.map((queue: JobGroupResponse) => (
            <TableRow key={queue.queue}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {queue.queue}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {queue.completed > 0 && (
                    <Badge variant="secondary" className="flex gap-1 items-center">
                      <CheckCircle className="h-3 w-3" />
                      {formatCount(queue.completed) ?? 0}
                    </Badge>
                  )}
                  {queue.released > 0 && (
                    <Badge variant="warning" className="flex gap-1 items-center">
                      <AlertCircle className="h-3 w-3" />
                      {formatCount(queue.released) ?? 0}
                    </Badge>
                  )}
                  {queue.failed > 0 && (
                    <Badge variant="error" className="flex gap-1 items-center">
                      <AlertOctagon className="h-3 w-3" />
                      {formatCount(queue.failed) ?? 0}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p className={Number(queue.average) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(Number(queue.average))}
                </p>
              </TableCell>
              <TableCell>
                <p className={Number(queue.p95) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(queue.p95 ?? 0)}
                </p>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(queue.queue)}`}>
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
