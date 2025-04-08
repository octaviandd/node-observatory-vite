/** @format */

import { Link } from "react-router";
import { ArrowUpDown, ExternalLink, Link as LinkIcon } from "lucide-react";
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
import { formatDate, formatDuration } from "@/utils.js";
import { RequestInstanceResponse } from "../../../../../types";

type Props = {
  data: RequestInstanceResponse[];
  handleSidePanel: (requestId: string, jobId: string, scheduleId: string) => void;
  children: React.ReactNode;
};

export const InstanceTable = React.memo(({ data, handleSidePanel, children }: Props) => {
  const getStatusVariant = (status: number) => {
    if (String(status).startsWith("2") || String(status).startsWith("3")) return "secondary";
    if (String(status).startsWith("4")) return "warning";
    return "error";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12.5%]">Date</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Duration</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request: RequestInstanceResponse) => (
            <TableRow key={request.uuid} className={request.content.statusCode.toString().startsWith("5") ? "bg-red-800/20" : ""}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(request.created_at)}
              </TableCell>
              <TableCell className="flex font-medium items-center gap-2 text-muted-foreground h-[53px]">
                <span>{request.content.method.toUpperCase()}</span>
                <ArrowUpDown className="h-4 w-4" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {request.content.route}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(request.content.statusCode)}>
                  {request.content.statusCode}
                </Badge>
              </TableCell>
              <TableCell>
                <p className={request.content.duration > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(request.content.duration)}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSidePanel(request.request_id ?? '', request.job_id ?? '', request.schedule_id ?? '')}
                  >
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link
                    to={`/request/${request.uuid}`}
                  >
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
