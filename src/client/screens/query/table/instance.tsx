/** @format */

import { Database, ExternalLink, Link2 } from "lucide-react";
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
import { QueryInstanceResponse } from "../../../../../types";

type Props = {
  data: QueryInstanceResponse[];
  handleSidePanel: (modelId: string, requestId: string, jobId: string, scheduleId: string) => void;
  children: React.ReactNode;
};

export const InstanceTable = ({ data, handleSidePanel, children }: Props) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((query: QueryInstanceResponse) => (
            <TableRow key={query.uuid} className={query.content.status === "failed" ? "bg-red-800/20" : ""}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(query.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {query.content.sql}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={query.content.status === "failed" ? "error" : "secondary"}>
                  <span>{query.content.status.toUpperCase()}</span>
                </Badge>
              </TableCell>
              <TableCell>
                <p className={query.content.duration > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(query.content.duration)}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSidePanel(query.uuid, query.request_id ?? '', query.job_id ?? '', query.schedule_id ?? '')}
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/query/${query.uuid}`}>
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
}
