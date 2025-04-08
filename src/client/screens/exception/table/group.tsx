/** @format */
import { AlertTriangle, Bug, ExternalLink } from "lucide-react";
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
import { formatCount } from "@/utils.js";
import { ExceptionGroupResponse } from "../../../../../types";

export const GroupTable = React.memo(({ data, children }: { data: ExceptionGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((exception: ExceptionGroupResponse) => (
            <TableRow key={exception.header}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Bug className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {exception.header}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {formatCount(exception.total)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(exception.header)}`}>
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
