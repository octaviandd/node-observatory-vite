/** @format */

import { ExternalLink, Link2 } from "lucide-react";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils.js";
import React from "react";
import { LogInstanceResponse } from "../../../../../types";

type Props = {
  data: LogInstanceResponse[];
  handleSidePanel: (uuid: string, requestId: string, jobId: string, scheduleId: string) => void;
  children: React.ReactNode;
};

export const InstanceTable = React.memo(({ data, handleSidePanel, children }: Props) => {
  const LOG_LEVELS = [
    { dataKey: "info", variant: "secondary" },
    { dataKey: "warn", variant: "warning" },
    { dataKey: "error", variant: "error" },
    { dataKey: "debug", variant: "debug" },
    { dataKey: "trace", variant: "trace" },
    { dataKey: "fatal", variant: "error" },
    { dataKey: "log", variant: "log" },
  ] as const;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((log: LogInstanceResponse) => (
            <TableRow key={log.uuid}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(log.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Badge
                  variant={LOG_LEVELS.find(level => level.dataKey === log.content.level)?.variant}
                  className="px-2 py-1 rounded-md font-medium text-xs"
                >
                  {log.content.level.toUpperCase()}
                </Badge>
                <p className="text-black dark:text-white">
                  {typeof log.content.message === 'object' ? JSON.stringify(log.content.message) : log.content.message}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSidePanel(log.uuid, log.request_id ?? '', log.job_id ?? '', log.schedule_id ?? '')}
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/log/${log.uuid}`}>
                    <Button variant="outline" size="icon">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {children}
    </div>
  );
});