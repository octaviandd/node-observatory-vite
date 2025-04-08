import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ViewCrumbs } from './crumbs';
import { RequestInstanceResponse, ViewInstanceResponse } from '../../../../../types';
import Source from './source';
import Details from './details';
import ContentTabs from './tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ViewPreview() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("raw");

  const [data, setData] = useState<{
    view: ViewInstanceResponse;
    source: RequestInstanceResponse | null;
    error: any;
    loading: boolean;
  }>({
    view: {} as ViewInstanceResponse,
    source: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    try {
      setData((prev) => ({ ...prev, loading: true }));
      const response = await fetch(`/observatory-api/data/views/${params.id}`);
      const { request, view } = await response.json();

      setData({
        view: view ? view[0] : null,
        source: request ? request[0] : null,
        error: null,
        loading: false,
      });
    } catch (error) {
      setData((prev) => ({ ...prev, error: error, loading: false }));
    }
  };

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
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

  if (!data.view) {
    return (
      <Alert variant="default">
        <AlertDescription>View data not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ViewCrumbs view={data.view} />

      {data.source && (
        <Source source={data.source} />
      )}

      <Details view={data.view} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} view={data.view} />
    </div>
  );
}