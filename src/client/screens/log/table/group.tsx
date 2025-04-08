/** @format */

import { ExternalLink, Logs } from "lucide-react";
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
import { LogGroupResponse } from "../../../../../types";

const LOG_LEVELS = [
  { dataKey: "info", variant: "secondary" },
  { dataKey: "warn", variant: "warning" },
  { dataKey: "error", variant: "error" },
  { dataKey: "debug", variant: "debug" },
  { dataKey: "trace", variant: "trace" },
  { dataKey: "fatal", variant: "error" },
  { dataKey: "log", variant: "log" },
] as const;

export const GroupTable = React.memo(({ data, children }: { data: LogGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60%]">Details</TableHead>
            <TableHead>Count</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((log: LogGroupResponse) => (
            <TableRow key={log.message}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Logs className="h-4 w-4 text-muted-foreground" />
                <p className="truncate max-w-[400px] text-black dark:text-white hover:underline">
                  {log.message}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Badge variant={LOG_LEVELS.find(level => level.dataKey === "info")?.variant} className="flex gap-1 items-center">
                    {log.info}
                  </Badge>
                  <Badge variant={LOG_LEVELS.find(level => level.dataKey === "warn")?.variant} className="flex gap-1 items-center">
                    {log.warn}
                  </Badge>
                  <Badge variant={LOG_LEVELS.find(level => level.dataKey === "error")?.variant} className="flex gap-1 items-center">
                    {log.error}
                  </Badge>
                  <Badge variant={LOG_LEVELS.find(level => level.dataKey === "debug")?.variant} className="flex gap-1 items-center">
                    {log.debug}
                  </Badge>
                  <Badge variant={LOG_LEVELS.find(level => level.dataKey === "trace")?.variant} className="flex gap-1 items-center">
                    {log.trace}
                  </Badge>
                  <Badge variant={LOG_LEVELS.find(level => level.dataKey === "fatal")?.variant} className="flex gap-1 items-center">
                    {log.fatal}
                  </Badge>
                  <Badge variant={LOG_LEVELS.find(level => level.dataKey === "log")?.variant} className="flex gap-1 items-center">
                    {log.log}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(log.message)}`}>
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
