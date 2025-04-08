/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";

type DataState = {
  request: any | null;
  notifications: any[];
  mails: any[];
  logs: any[];
  queries: any[];
  https: any[];
  jobs: any[];
  caches: any[];
};

export const usePreviewData = () => {
  const params = useParams();
  const [data, setData] = useState<DataState>({
    request: [],
    notifications: [],
    mails: [],
    logs: [],
    queries: [],
    https: [],
    jobs: [],
    caches: [],
  });

  useEffect(() => {
    getItem();
  }, []);

  const getItem = async () => {
    const response = await fetch(`/observatory-api/data/requests/${params.id}`);
    const result = await response.json();

    const { request, query, http, job, cache, notification, mail, logs } =
      result;

    setData({
      request: request ? request[0] : [],
      queries: query || [],
      https: http || [],
      jobs: job || [],
      caches: cache || [],
      notifications: notification || [],
      mails: mail || [],
      logs: logs || [],
    });
  };

  return data
};
