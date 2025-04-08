/** @format */

import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { HTTPCrumbs } from "./crumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JobInstanceResponse, RequestInstanceResponse, ScheduleInstanceResponse, HttpClientInstanceResponse } from "../../../../../types";
import Source from "./source";
import { HTTPInfo } from "./info";
import ContentTabs from "./tabs";

export default function HTTPView() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("raw");
  const [data, setData] = useState<{
    http: HttpClientInstanceResponse;
    loading: boolean;
    error: string | null;
    source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
  }>({
    http: {} as HttpClientInstanceResponse,
    loading: true,
    error: null,
    source: null,
  });

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    setData(prevState => ({ ...prevState, loading: true }));
    try {
      const response = await fetch(`/observatory-api/data/http/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch HTTP data');
      }
      const { http, request, job, schedule } = await response.json();

      if (!http?.[0]) {
        throw new Error('HTTP not found');
      }

      setData(prevState => ({ ...prevState, http: http[0], loading: false, error: null, source: request ? request[0] : job ? job[0] : schedule ? schedule[0] : null }));
    } catch (error) {
      console.error('Error fetching HTTP data:', error);
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

  if (!data.http) return null;

  return (
    <div className="flex flex-col gap-6">
      <HTTPCrumbs http={data.http} />

      {data.source && (
        <Source source={data.source} />
      )}

      <HTTPInfo http={data.http} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
    </div>
  );
}
