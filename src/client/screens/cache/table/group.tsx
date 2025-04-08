/** @format */
import { ExternalLink, DatabaseZap } from "lucide-react";
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
import { CacheGroupResponse } from "../../../../../types";

export default function GroupTable({ data, children }: { data: CacheGroupResponse[], children: React.ReactNode }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((cache: CacheGroupResponse) => (
            <TableRow key={cache.cache_key}>
              <TableCell className="flex items-center gap-2 h-[53px]">
                <DatabaseZap className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {cache.cache_key}
                  </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {cache.hits > 0 && (
                    <Badge variant="secondary" className="flex gap-1 items-center">
                      {formatCount(cache.hits)}
                    </Badge>
                  )}
                  {cache.writes > 0 && (
                    <Badge variant="warning" className="flex gap-1 items-center">
                      {formatCount(cache.writes)}
                    </Badge>
                  )}
                  {cache.misses > 0 && (
                    <Badge variant="error" className="flex gap-1 items-center">
                      {formatCount(cache.misses)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <p className={cache.average as number > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(cache.average as number)}
                </p>
              </TableCell>
              <TableCell>
                <Link to={`${encodeURIComponent(cache.cache_key)}`}>
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