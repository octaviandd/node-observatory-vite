/** @format */

import { ExternalLink, Link2, Cuboid } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/utils.js";
import { ModelInstanceResponse } from "../../../../../types";

type Props = {
  data: ModelInstanceResponse[];
  children: React.ReactNode;
  handleSidePanel: (uuid: string, requestId: string, jobId: string, scheduleId: string) => void;
};

export const InstanceTable = React.memo(({ data, children, handleSidePanel }: Props) => {
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
          {data.map((model: ModelInstanceResponse) => (
            <TableRow key={model.uuid} className={model.content.status === "failed" ? "bg-red-800/20" : ""}>
              <TableCell className="font-medium text-muted-foreground" >
                {formatDate(model.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Cuboid className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {model.content.modelName}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={model.content.status === "failed" ? "destructive" : "secondary"}>
                  {model.content.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={Number(model.content.duration) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(Number(model.content.duration ?? 0))}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSidePanel(model.uuid, model.request_id ?? '', model.job_id ?? '', model.schedule_id ?? '')
                    }}
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/model/${model.uuid}`}>
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
