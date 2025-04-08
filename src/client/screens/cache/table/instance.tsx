/** @format */

import { ExternalLink, Link2 } from "lucide-react";
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
import { formatDate } from "@/utils.js";
import { CacheInstanceResponse } from "../../../../../types";

type Props = {
  data: CacheInstanceResponse[];
  handleSidePanel: (modelId: string, requestId: string, jobId: string, scheduleId: string) => void;
  children: React.ReactNode;
};

export default function InstanceTable({ data, handleSidePanel, children }: Props) {
  const getStatusVariant = (hits: number, writes: number, misses: number) => {
    if (hits > 0) {
      if (writes > 0) return 'secondary';
      return 'secondary';
    }
    if (writes > 0) return 'warning';
    if (misses > 0) return 'error';
    return 'secondary';
  };

  const getStatusText = (hits: number, writes: number, misses: number) => {
    if (hits > 0) {
      if (writes > 0) return 'HIT + WRITE';
      return 'HIT';
    }
    if (writes > 0) return 'WRITE';
    if (misses > 0) return 'MISS';
    return 'HIT';
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
          {data.map((cache: CacheInstanceResponse) => (
            <TableRow key={cache.uuid}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(cache.created_at)}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <p className="text-muted-foreground">[{cache.content.type.toUpperCase()}]</p>
                  <p className="text-black dark:text-white">{cache.content.key}</p>
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(cache.content.hits, cache.content.writes, cache.content.misses)}>
                  {getStatusText(cache.content.hits, cache.content.writes, cache.content.misses)}
                </Badge>
              </TableCell>
              <TableCell>
                <p className={Number(cache.content.duration) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {(parseFloat(cache.content.duration as string) / 1000).toFixed(6)}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSidePanel(cache.uuid, cache.request_id ?? '', cache.job_id ?? '', cache.schedule_id ?? '')}
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link
                    to={`/cache/${cache.uuid}`}
                  >
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
