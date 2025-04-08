/** @format */

import React, { useContext, useEffect, useState } from "react";
import { StoreContext } from "@/store";
import { timePeriod } from "@/utils";
import { useParams } from "react-router";

export const useIndexData = ({
  type,
}: {
  type: string;
}) => {
  const { state } = useContext(StoreContext);
  const params = useParams();
  const param = params.key || "";
  const [data, setData] = useState<{
    results: any[];
    countFormattedData: any;
    durationFormattedData: any;
    count: number;
    indexCountOne: number;
    indexCountTwo: number;
    indexCountThree: number;
    indexCountFour?: number;
    indexCountFive?: number;
    indexCountSix?: number;
    indexCountSeven?: number;
    indexCountEight?: number;
    shortest: 0;
    longest: 0;
    average: 0;
    p95: 0;
  }>({
    results: [],
    countFormattedData: [],
    durationFormattedData: [],
    count: 0,
    indexCountOne: 0,
    indexCountTwo: 0,
    indexCountThree: 0,
    shortest: 0,
    longest: 0,
    average: 0,
    p95: 0,
  });

  useEffect(() => {
    getItems();
  }, [state.period, param]);

  const period: string = timePeriod(state.period);

  const currentDate = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "")
    .toUpperCase();

  const getItems = async (addedNewItems = false) => {
    try {
      const response = await fetch(
        `/observatory-api/data/${type}?period=${state.period}${
          param ? `&key=${encodeURIComponent(param)}` : ""
        }`
      );

      const {
        results,
        countFormattedData,
        durationFormattedData,
        count,
        indexCountOne,
        indexCountTwo,
        indexCountThree,
        indexCountFour,
        indexCountFive,
        indexCountSix,
        indexCountSeven,
        indexCountEight,
        shortest,
        longest,
        average,
        p95,
      } = await response.json();

      setData((prevData) => ({
        ...prevData,
        results: addedNewItems ? [...prevData.results, ...results] : results,
        count,
        indexCountOne,
        indexCountTwo,
        indexCountThree,
        indexCountFour,
        indexCountFive,
        indexCountSix,
        indexCountSeven,
        indexCountEight,
        shortest,
        longest,
        average,
        p95,
        countFormattedData,
        durationFormattedData,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  return { data, currentDate, period };
};
