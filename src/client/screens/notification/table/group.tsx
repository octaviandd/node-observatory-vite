/** @format */

import { AlertOctagon, CheckCircle, ExternalLink, Globe } from "lucide-react";
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
import { NotificationGroupResponse } from "../../../../../types";

export const GroupTable = React.memo(({ data, children }: { data: NotificationGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((channel: NotificationGroupResponse) => (
            <TableRow key={channel.channel}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {channel.channel === "" ? "No channel [error]" : channel.channel}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {channel.completed > 0 &&
                    <Badge variant="secondary" className="flex gap-1 items-center">
                      <CheckCircle className="h-3 w-3" />
                      {formatCount(channel.completed)}
                    </Badge>
                  }
                  {channel.failed > 0 && (
                    <Badge variant="error" className="flex gap-1 items-center">
                      <AlertOctagon className="h-3 w-3" />
                      {formatCount(channel.failed)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p className={channel.average && channel.average > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(channel.average ?? 0)}
                </p>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(channel.channel === "" ? "No channel [error]" : channel.channel)}`}>
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
