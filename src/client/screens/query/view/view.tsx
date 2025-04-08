/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QueryCrumbs } from "./crumbs";
import { QueryInstanceResponse, RequestInstanceResponse, JobInstanceResponse, ScheduleInstanceResponse } from "../../../../../types";
import Source from "./source";
import Details from "./details";
import ContentTabs from "./tabs";

export default function QueryPreview() {
  const params = useParams();
  const [data, setData] = useState<{
    query: QueryInstanceResponse;
    loading: boolean;
    error: string | null;
    source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
  }>({
    query: {} as QueryInstanceResponse,
    loading: true,
    error: null,
    source: null,
  });
  const [activeTab, setActiveTab] = useState("raw");

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    setData((prev: any) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      setData((prev: any) => ({ ...prev, loading: true, error: null }));
      const response = await fetch(`/observatory-api/data/queries/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch query data');
      }
      const result = await response.json();
      const { query, request, job, schedule } = result;

      if (!query || query.length === 0) {
        throw new Error('Query data not found');
      }

      setData((prev: any) => ({
        ...prev,
        query: query[0],
        loading: false,
        error: null,
        source: request ? request[0] : job ? job[0] : schedule ? schedule[0] : null
      }));
    } catch (error) {
      console.error('Error fetching query data:', error);
      setData((prev: any) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
    }
  };

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[50px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[250px] w-full" />
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

  if (!data.query) {
    return (
      <Alert variant="default">
        <AlertDescription>Query data not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      <QueryCrumbs query={data.query} />

      {data.source && (
        <Source source={data.source} />
      )}

      <Details query={data.query} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
    </div>
  );
}
