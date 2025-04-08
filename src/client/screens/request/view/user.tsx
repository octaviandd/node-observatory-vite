/** @format */

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RequestInstanceResponse } from "../../../../../types";

export const RequestPreviewUser = React.memo(
  ({ request }: { request: RequestInstanceResponse }) => {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-5">
          <h3 className="text-xl font-medium">User</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground uppercase">
              IP Address
            </span>
            <span>{request.content.ip}</span>
          </div>
          {request.content.session && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground uppercase">
                  Session
                </span>
                <span>{JSON.stringify(request.content.session)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
);
