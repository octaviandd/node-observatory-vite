/** @format */

import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { CacheCrumbs } from "./crumbs";
import { CachePreviewInfo } from "./info";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CacheInstanceResponse, RequestInstanceResponse, JobInstanceResponse, ScheduleInstanceResponse } from "../../../../../types";
import Source from "./source";
import ContentTabs from "./tabs";

export default function CachePreview() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("raw");
  const [data, setData] = useState<{
    cache: CacheInstanceResponse;
    loading: boolean;
    error: string | null;
    source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
  }>({
    cache: {} as CacheInstanceResponse,
    loading: true,
    error: null,
    source: null,
  });

  useEffect(() => {
    getItem();
  }, [params.cacheId]);

  const getItem = async () => {
    setData({ ...data, loading: true });
    try {
      const response = await fetch(`/observatory-api/data/cache/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cache data');
      }
      const { request, cache, job, schedule } = await response.json();

      if (!cache) {
        throw new Error('Cache data not found');
      }

      setData({ cache: cache[0], loading: false, error: null, source: request ? request[0] : job ? job[0] : schedule ? schedule[0] : null });
    } catch (error) {
      console.error('Error fetching cache data:', error);
      setData({ ...data, loading: false, error: error instanceof Error ? error.message : 'An error occurred' });
    }
  };

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
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

  return (
    <div className="flex flex-col gap-y-6">
      <CacheCrumbs cache={data.cache} />

      {data.source && (
        <Source source={data.source} />
      )}

      <CachePreviewInfo cache={data.cache} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
    </div>
  );
}
