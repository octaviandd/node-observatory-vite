/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModelCrumbs } from "./crumbs";
import { ModelInstanceResponse, RequestInstanceResponse, JobInstanceResponse, ScheduleInstanceResponse } from "../../../../../types";
import Source from "./source";
import ContentTabs from "./tabs";
import Details from "./details";

export default function ModelPreview() {
  const params = useParams();
  const [data, setData] = useState<{
    model: ModelInstanceResponse;
    loading: boolean;
    error: string | null;
    source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
  }>({
    model: {} as ModelInstanceResponse,
    loading: true,
    error: null,
    source: null,
  });
  const [activeTab, setActiveTab] = useState("raw");

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    try {
      setData((prev: any) => ({ ...prev, loading: true }));
      const response = await fetch(`/observatory-api/data/models/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch model data');
      }
      const result = await response.json();
      const { model, request, job, schedule } = result;

      if (!model) {
        throw new Error('Model data not found');
      }

      setData((prev: any) => ({ ...prev, model: model[0], loading: false, error: null, source: request ? request[0] : job ? job[0] : schedule ? schedule[0] : null }));
    } catch (error) {
      console.error('Error fetching model data:', error);
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

  return (
    <div className="flex flex-col gap-6">
      <ModelCrumbs model={data.model} />

      {data.source && (
        <Source source={data.source} />
      )}

      <Details model={data.model} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
    </div>
  );
}
