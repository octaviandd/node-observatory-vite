/** @format */

import { ExternalLink, Globe, LinkIcon } from "lucide-react";
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
import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/utils.js";
import { HttpClientInstanceResponse } from "../../../../../types";

type Props = {
  data: HttpClientInstanceResponse[];
  handleSidePanel: (modelId: string, requestId: string, jobId: string, scheduleId: string) => void;
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
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request: HttpClientInstanceResponse) => (
            <TableRow key={request.uuid}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(request.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <span className="text-black">{request.content.method.toUpperCase()}</span>
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {request.content.href || (request.content.origin ?? '') + (request.content.path ?? '')}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(request.content.statusCode)}>
                  {request.content.statusCode !== 0 ? request.content.statusCode : "Internal Error"}
                </Badge>
              </TableCell>
              <TableCell>
                <p className={request.content.duration && request.content.duration > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(request.content.duration)}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSidePanel(request.uuid, request.request_id ?? '', request.job_id ?? '', request.schedule_id ?? '')}
                  >
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/http/${request.uuid}`}>
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
