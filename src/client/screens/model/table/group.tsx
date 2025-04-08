/** @format */

import { Cuboid, ExternalLink } from "lucide-react";
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
import { formatDuration } from "@/utils.js";
import { ModelGroupResponse } from "../../../../../types";

export const GroupTable = React.memo(({ data, children }: { data: ModelGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Avg</TableHead>
            <TableHead>P95</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((model: ModelGroupResponse) => (
            <TableRow key={model.modelName}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Cuboid className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {model.modelName}
                </span>
              </TableCell>
              <TableCell>
                <span className={Number(model.average) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(Number(model.average ?? 0))}
                </span>
              </TableCell>
              <TableCell>
                <span className={Number(model.p95) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(Number(model.p95 ?? 0))}
                </span>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(model.modelName)}`}>
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
