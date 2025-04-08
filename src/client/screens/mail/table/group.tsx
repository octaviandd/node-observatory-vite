/** @format */

import { AlertOctagon, ArrowUpDown, CheckCircle, ExternalLink, Mail } from "lucide-react";
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
import { MailGroupResponse } from "../../../../../types";

export const GroupTable = React.memo(({ data, children }: { data: MailGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70%]">Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Avg</TableHead>
            <TableHead>P95</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((receiver: MailGroupResponse) => (
            <TableRow key={receiver.mail_to}>
              <TableCell className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {receiver.mail_to}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {receiver.success_count > 0 &&
                    <Badge variant="secondary" className="flex gap-1 items-center">
                      <CheckCircle className="h-3 w-3" />
                      {formatCount(receiver.success_count)}
                    </Badge>
                  }
                  {receiver.failed_count > 0 && (
                    <Badge variant="error" className="flex gap-1 items-center">
                      <AlertOctagon className="h-3 w-3" />
                      {formatCount(receiver.failed_count)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p className={Number(receiver.average) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(Number(receiver.average))}
                </p>
              </TableCell>
              <TableCell>
                <p className={Number(receiver.p95) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(Number(receiver.p95 ?? 0))}
                </p>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(receiver.mail_to)}`}>
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
