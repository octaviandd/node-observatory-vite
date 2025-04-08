/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { LogCrumbs } from "./crumbs";
import { LogInstanceResponse, JobInstanceResponse, RequestInstanceResponse, ScheduleInstanceResponse } from "../../../../../types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import ContentTabs from "./tabs";
import Source from "./source";
import Details from "./details";

export default function LogView() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("raw");

  const [data, setData] = useState<{
    log: LogInstanceResponse;
    loading: boolean;
    error: string | null;
    source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
  }>({
    log: {} as LogInstanceResponse,
    loading: true,
    error: null,
    source: null,
  });

  useEffect(() => {
    getItem();
  }, []);

  const getItem = async () => {
    try {
      setData(prevState => ({ ...prevState, loading: true }));
      const response = await fetch(`/observatory-api/data/logs/${params.id}`);
      const { request, log, job, schedule } = await response.json();

      setData(prevState => ({ ...prevState, log: log ? log[0] : null, loading: false, error: null, source: request ? request[0] : job ? job[0] : schedule ? schedule[0] : null }));
    } catch (error) {
      setData(prevState => ({ ...prevState, loading: false, error: error instanceof Error ? error.message : 'An error occurred', source: null }));
    }
  };

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (data.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{data.error}</AlertDescription>
      </Alert>
    );
  }

  const LOG_LEVELS = [
    { dataKey: "info", variant: "secondary" },
    { dataKey: "warn", variant: "warning" },
    { dataKey: "error", variant: "error" },
    { dataKey: "debug", variant: "debug" },
    { dataKey: "trace", variant: "trace" },
    { dataKey: "fatal", variant: "error" },
    { dataKey: "log", variant: "log" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <LogCrumbs log={data.log} />

      {data.source && (
        <Source source={data.source} />
      )}

      <Details data={{ log: data.log }} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={{ log: data.log }} />
    </div>
  );
}
