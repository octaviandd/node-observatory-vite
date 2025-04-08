/** @format */

import { AlertOctagon, CheckCircle, Database, ExternalLink } from "lucide-react";
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
import { formatCount, formatDuration } from "@/utils.js";
import { QueryGroupResponse } from "../../../../../types";

export const GroupTable = ({ data, children }: { data: QueryGroupResponse[], children: React.ReactNode }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Queries</TableHead>
            <TableHead>Avg</TableHead>
            <TableHead>P95</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((endpoint: QueryGroupResponse) => (
            <TableRow key={endpoint.endpoint}>
              <TableCell className="flex gap-2 items-center h-[53px]">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {endpoint.endpoint}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {endpoint.completed > 0 &&
                    <Badge variant="secondary" className="flex gap-1 items-center">
                      <CheckCircle className="h-3 w-3" />
                      {formatCount(endpoint.completed)}
                    </Badge>}
                  {endpoint.failed > 0 &&
                    <Badge variant="error" className="flex gap-1 items-center">
                      <AlertOctagon className="h-3 w-3" />
                      {formatCount(endpoint.failed)}
                    </Badge>}
                </div>
              </TableCell>
              <TableCell>
                <p className={endpoint.average && endpoint.average > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {endpoint.average ? formatDuration(endpoint.average) : "N/A"}
                </p>
              </TableCell>
              <TableCell>
                <p className={endpoint.p95 && endpoint.p95 > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {endpoint.p95 ? formatDuration(endpoint.p95) : "N/A"}
                </p>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(endpoint.endpoint)}`}>
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
}
