/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { JobPreviewCrumbs } from "./crumbs";
import { JobPreviewDetails } from "./details";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ContentTabs from "./tabs";
import { HttpClientInstanceResponse, ModelInstanceResponse, JobInstanceResponse, NotificationInstanceResponse, MailInstanceResponse, LogInstanceResponse, ExceptionInstanceResponse, CacheInstanceResponse, RequestInstanceResponse, ScheduleInstanceResponse, QueryInstanceResponse } from "../../../../../types";
import Source from "./source";

export default function JobPreview() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [data, setData] = useState<{
    job: JobInstanceResponse;
    notifications: NotificationInstanceResponse[];
    mails: MailInstanceResponse[];
    logs: LogInstanceResponse[];
    exceptions: ExceptionInstanceResponse[];
    caches: CacheInstanceResponse[];
    https: HttpClientInstanceResponse[];
    models: ModelInstanceResponse[];
    requests: RequestInstanceResponse[];
    queries: QueryInstanceResponse[];
    schedule: ScheduleInstanceResponse[];
    error: string | null;
    loading: boolean;
  }>({
    job: {} as JobInstanceResponse,
    notifications: [] as NotificationInstanceResponse[],
    mails: [] as MailInstanceResponse[],
    logs: [] as LogInstanceResponse[],
    exceptions: [] as ExceptionInstanceResponse[],
    caches: [] as CacheInstanceResponse[],
    https: [] as HttpClientInstanceResponse[],
    models: [] as ModelInstanceResponse[],
    requests: [] as RequestInstanceResponse[],
    queries: [] as QueryInstanceResponse[],
    schedule: [] as ScheduleInstanceResponse[],
    error: null,
    loading: false,
  });

  const [activeTab, setActiveTab] = useState("raw");

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    setData(prevState => ({ ...prevState, loading: true }));
    try {
      const response = await fetch(`/observatory-api/data/jobs/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job data');
      }
      const data = await response.json();
      const { query, http, job, cache, notification, mail, log, exception, request, model, schedule } = data;

      console.log(data)

      if (!job?.[0]) {
        throw new Error('Job data not found');
      }

      setJob(job[0]);
      setData(prevState => ({ ...prevState, notifications: notification ?? [], mails: mail ?? [], logs: log ?? [], exceptions: exception ?? [], caches: cache ?? [], https: http ?? [], models: model ?? [], requests: request ?? [], job: job ?? [], schedule: schedule ?? [], queries: query ?? [] }));
    } catch (error) {
      console.error('Error fetching job data:', error);
      setData(prevState => ({ ...prevState, error: error instanceof Error ? error.message : 'An error occurred' }));
    } finally {
      setData(prevState => ({ ...prevState, loading: false }));
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

  if (!job) return null;

  return (
    <div className="flex flex-col gap-y-6">
      <JobPreviewCrumbs job={job} />

      {data.requests.length > 0 && (
        <Source source={data.requests[0]} />
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-x-4">
            <span className="text-sm text-muted-foreground uppercase">Details</span>
            <span>{job.duration}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <JobPreviewDetails
            queries={data.queries}
            caches={data.caches}
            https={data.https}
            notifications={data.notifications}
            mails={data.mails}
            logs={data.logs}
            exceptions={data.exceptions}
          />
        </CardContent>
      </Card>

      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={{ job, notifications: data.notifications, mails: data.mails, logs: data.logs, queries: data.queries, caches: data.caches, https: data.https, exceptions: data.exceptions, models: data.models }} />
    </div>
  );
}
