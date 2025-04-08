/** @format */

import { ExternalLink, FileCode } from "lucide-react";
import React from "react";
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
import { getSize, formatDuration } from "@/utils.js";
import { ViewGroupResponse } from "../../../../../types";

export const GroupTable = React.memo(({ data, children }: { data: ViewGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>P95</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((path: ViewGroupResponse) => (
            <TableRow key={path.view}>
              <TableCell className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {path.view}
                </span>
              </TableCell>
              <TableCell className="text-black dark:text-white">
                {getSize(Number(path.size))}
              </TableCell>
              <TableCell>
                <span className={path.average && path.average > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(path.average ?? 0)}
                </span>
              </TableCell>
              <TableCell>
                <span className={path.p95 && path.p95 > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(path.p95 ?? 0)}
                </span>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(path.view)}`}>
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
