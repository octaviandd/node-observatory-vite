/** @format */

import React from "react";
import { ExceptionInstanceResponse } from "../../../../../types";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/utils.js";
import { Badge } from "@/components/ui/badge";

export const ExceptionInfo = React.memo(({ exception }: { exception: ExceptionInstanceResponse }) => {
  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Time</div>
            <div className="col-span-9">
              {new Date(exception.created_at).toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })}{" "}
              ({timeAgo(exception.created_at)})
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Title</div>
            <div className="col-span-9">{exception.content.title}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Type</div>
            <div className="col-span-9">
              <Badge variant="secondary">{exception.content.type}</Badge>
            </div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">File</div>
            <div className="col-span-9">{exception.content.file}</div>
          </div>

          <div className="grid items-center grid-cols-12">
            <div className="col-span-3 text-muted-foreground">Line</div>
            <div className="col-span-9">{exception.content.line}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});