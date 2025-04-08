/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import MailCrumbs from "./crumbs";
import MailPreviewInfo from "./info";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequestInstanceResponse, JobInstanceResponse, ScheduleInstanceResponse, MailInstanceResponse } from "../../../../../types";
import Source from "./source";
import ContentTabs from "./tabs";

export default function MailPreview() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("raw");

  const [data, setData] = useState<{
    mail: MailInstanceResponse;
    loading: boolean;
    error: string | null;
    source: RequestInstanceResponse | JobInstanceResponse | ScheduleInstanceResponse | null;
  }>({
    mail: {} as MailInstanceResponse,
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
      const response = await fetch(`/observatory-api/data/mails/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch mail data');
      }
      const { mail, request, job, schedule } = await response.json();
      if (!mail || mail.length === 0) {
        throw new Error('Mail data not found');
      }

      setData(prevState => ({ ...prevState, mail: mail[0], loading: false, error: null, source: request ? request[0] : job ? job[0] : schedule ? schedule[0] : null }));
    } catch (error) {
      console.error('Error fetching mail data:', error);
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

  return (
    <div className="flex flex-col gap-y-6">
      <MailCrumbs mail={data.mail} />

      {data.source && (
        <Source source={data.source} />
      )}

      <MailPreviewInfo mail={data.mail} />
      <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
    </div>
  );
}
