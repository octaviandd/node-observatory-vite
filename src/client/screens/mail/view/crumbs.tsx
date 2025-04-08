/** @format */

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { MailInstanceResponse } from "../../../../../types";

export default function MailCrumbs({ mail }: { mail: MailInstanceResponse }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-y-4 p-6">
        <Breadcrumb className="flex items-center gap-x-4">
          <BreadcrumbItem>
            <BreadcrumbLink href="/mails" className="text-muted-foreground">Mails</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem className="text-muted-foreground px-2">
            <ChevronRight className="h-3 w-3" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-muted-foreground">{mail.content.to}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <div className="flex items-center gap-x-4">
          <Badge variant="secondary">{mail.content.package}</Badge>
          <Badge variant={mail.content.status === "completed" ? "secondary" : "destructive"}>
            {mail.content.status.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
