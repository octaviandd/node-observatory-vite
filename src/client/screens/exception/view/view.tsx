/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExceptionCrumbs } from "./crumbs";
import { ExceptionInstanceResponse, ScheduleInstanceResponse, JobInstanceResponse, RequestInstanceResponse } from "../../../../../types";
import Source from "./source";
import { ExceptionInfo } from "./info";
import ContentTabs from "./tabs";

export default function ExceptionView() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("raw");

  const [data, setData] = useState<{
    exception: ExceptionInstanceResponse;
    source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
    loading: boolean;
    error: string | null;
  }>({
    exception: {} as ExceptionInstanceResponse,
    source: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    setData({
      ...data,
      loading: true,
    });
    try {
      const response = await fetch(`/api/data/exceptions/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch exception data');
      }
      const { exception, request, job, schedule } = await response.json();

      if (!exception?.[0]) {
        throw new Error('Exception not found');
      }

      setData({
        ...data,
        exception: exception[0],
        source: request ? request[0] : job ? job[0] : schedule ? schedule[0] : null,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching exception data:', error);
      setData({
        ...data,
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false,
      });
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

  if (!data.exception) return null;

  return (
    <div className="flex flex-col gap-6">
      <ExceptionCrumbs exception={data.exception} />

      {data.source && (
        <Source source={data.source} />
      )}

      <ExceptionInfo exception={data.exception} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
    </div>
  );
}
