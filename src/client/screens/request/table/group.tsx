/** @format */

import { Link } from "react-router";
import { AlertCircle, AlertOctagon, ArrowUpDown, CheckCircle, ExternalLink } from "lucide-react";
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
import { formatCount, formatDuration } from "@/utils.js";
import { RequestGroupResponse } from "../../../../../types";


export const GroupTable = React.memo(({ data, children }: { data: RequestGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Avg</TableHead>
            <TableHead>P95</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request: any) => (
            <TableRow key={request.route}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {request.route ?? request._id}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {request.count_200 > 0 &&
                    <Badge variant="secondary" className="flex gap-1 items-center">
                      <CheckCircle className="h-3 w-3" />
                      {formatCount(request.count_200)}
                    </Badge>}
                  {request.count_400 > 0 && (
                    <Badge variant="warning" className="flex gap-1 items-center">
                      <AlertCircle className="h-3 w-3" />
                      {formatCount(request.count_400)}
                    </Badge>
                  )}
                  {request.count_500 > 0 && (
                    <Badge variant="error" className="flex gap-1 items-center">
                      <AlertOctagon className="h-3 w-3" />
                      {formatCount(request.count_500)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p className={request.average > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(request.average)}
                </p>
              </TableCell>
              <TableCell>
                <p className={request.p95 > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(request.p95)}
                </p>
              </TableCell>
              <TableCell>
                <Link
                  to={`${encodeURIComponent(request.route)}`}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
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
