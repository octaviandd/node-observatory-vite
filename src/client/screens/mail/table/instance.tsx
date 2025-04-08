/** @format */

import { ExternalLink, Link2, Mail } from "lucide-react";
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
import React from "react";
import { formatDuration, formatDate } from "@/utils.js";
import { MailInstanceResponse } from "../../../../../types";

type Props = {
  data: MailInstanceResponse[];
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
          {data.map((mail: MailInstanceResponse) => (
            <TableRow key={mail.uuid}>
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(mail.created_at)}
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[400px] text-black dark:text-white">
                  {mail.content.to}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={mail.content.status === "completed" ? "secondary" : "error"}>
                  {mail.content.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <p className={Number(mail.content.duration) > 999 ? "text-yellow-600" : "text-black dark:text-white"}>
                  {formatDuration(Number(mail.content.duration ?? 0))}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSidePanel(mail.uuid, mail.request_id ?? '', mail.job_id ?? '', mail.schedule_id ?? '')}
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Link to={`/mail/${mail.uuid}`}>
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
