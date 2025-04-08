/** @format */

import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router";
import { timeAgo } from "@/utils.js";
import { StoreContext } from "../../../store";
import { RedisResponse } from "../types";
import { Globe, BarChart, ArrowRight } from "lucide-react";

export default function RedisIndex() {
  const [data, setData] = useState<RedisResponse[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(20);
  const [noMoreItems, setNoMoreItems] = useState(false);
  const [requestType, setRequestType] = useState("all");
  const { state } = useContext(StoreContext);

  useEffect(() => {
    fetch(`/api/data/redis`)
      .then((res) => res.json())
      .then((data) => {
        setData(data.results);
        setCount(data.count);
      });
  }, [state.period, requestType]);

  const getMoreItems = async () => {
    const response = await fetch(`/api/data/redis?offset=${offset}`);
    const data = await response.json();
    if (data.results.length === 0) {
      setNoMoreItems(true);
      return;
    }
    setData([...data, ...data.results]);
    setOffset(offset + 20);
  };

  return (
    <div className="flex flex-col">
      <div className="border border-neutral-700 bg-[#0b0f16] p-4 rounded-md">
        <div className="flex justify-between px-4 items-center">
          <div className="flex items-center gap-x-2">
            <BarChart size={20} />
            <span className="text-sm">Activity</span>
          </div>
          <div className="flex items-center gap-x-2">
            <span className="text-sm">QUERIES</span>
            <ArrowRight size={20} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 bg-[#0D121C] mt-6">
          <div className="bg-[#171D2B] text-white p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm text-gray-400">QUERIES</h3>
                <p className="text-2xl font-bold">{count}</p>
              </div>
              <div className="text-xs flex gap-2">
                <div className="text-gray-400 flex flex-col items-center">
                  <span>1/2/3XX</span>
                  {/* <span>
                    {
                      data.results.filter(
                        (request) =>
                          request.content.statusCode.toString().includes("1") ||
                          request.content.statusCode.toString().includes("2") ||
                          request.content.statusCode.toString().includes("3")
                      ).length
                    }
                  </span> */}
                </div>
                <div className="text-yellow-600 flex flex-col items-center">
                  <span>4xx</span>
                  {/* <span>
                    {
                      data.results.filter((request) =>
                        request.content.statusCode.toString().includes("4")
                      ).length
                    }
                  </span>
                </div>
                <div className="text-red-500 flex flex-col items-center">
                  <span>5XX</span>
                  <span>
                    {
                      data.results.filter((request) =>
                        request.content.statusCode.toString().includes("5")
                      ).length
                    }
                  </span> */}
                </div>
              </div>
            </div>
            {/* <RequestGraph data={data.results} /> */}
            <div className="flex justify-between text-xs text-gray-400 mt-4">
              <span>
                {new Date(
                  Date.now() -
                  (state.period === "1h"
                    ? 1 * 60 * 60 * 1000
                    : state.period === "24h"
                      ? 24 * 60 * 60 * 1000
                      : state.period === "14d"
                        ? 14 * 24 * 60 * 60 * 1000
                        : 7 * 24 * 60 * 60 * 1000)
                )
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(",", "")
                  .toUpperCase()}
              </span>
              <span>
                {new Date()
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(",", "")
                  .toUpperCase()}
              </span>
            </div>
          </div>

          <div className="bg-[#171D2B] text-white p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm text-gray-400">DURATION</h3>
                {/* <p className="text-2xl font-bold">
                  {data.shortestRequest}ms – {data.longestRequest}ms
                </p> */}
              </div>
              <div className="text-xs flex items-center gap-x-2">
                <p>
                  <span className="text-gray-400">AVG</span>
                  {/* <span className="font-bold text-white">
                    {parseFloat(data.requestsAverageTime).toFixed(2)}ms
                  </span> */}
                </p>
                <p>
                  <span className="text-gray-400">P95</span>
                  <span className="font-bold text-yellow-600"> 442ms</span>
                </p>
              </div>
            </div>
            {/* <DurationGraph data={data.results} /> */}
            <div className="flex justify-between text-xs text-gray-400 mt-4">
              <span>
                {new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(",", "")
                  .toUpperCase()}
              </span>
              <span>
                {new Date()
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(",", "")
                  .toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-x-2">
          <Globe size={20} />
          <span className="font-medium text-sm">{count} Hits</span>
        </div>
        <div className="grid grid-rows-1 grid-cols-4 text-sm tracking-wide rounded-md bg-[#171D2B]">
          <button
            className={`px-3 py-2 rounded-l-md hover:bg-neutral-500 flex items-center justify-center text-sm ${requestType === "all" ? "bg-neutral-500" : ""
              }`}
            onClick={() => setRequestType("all")}
          >
            View All
          </button>
          <button
            className={`px-3 py-2 hover:bg-neutral-500 flex items-center justify-center text-sm ${requestType === "2xx" ? "bg-neutral-500" : ""
              }`}
            onClick={() => setRequestType("2xx")}
          >
            2xx
          </button>
          <button
            className={`px-3 py-2 hover:bg-neutral-500 flex items-center justify-center text-sm ${requestType === "4xx" ? "bg-neutral-500" : ""
              }`}
            onClick={() => setRequestType("4xx")}
          >
            4xx
          </button>
          <button
            className={`px-3 py-2 rounded-r-md hover:bg-neutral-500 flex items-center justify-center text-sm ${requestType === "5xx" ? "bg-neutral-500" : ""
              }`}
            onClick={() => setRequestType("5xx")}
          >
            5xx
          </button>
        </div>
      </div>
      <div>
        <div>
          <div className="w-full grid grid-cols-12 py-3 px-2 font-semibold text-sm border border-neutral-700">
            <span className="col-span-3">Key</span>
            <span className="col-span-3">Value</span>
            <span className="col-span-1">Type</span>
            <span className="col-span-1">DB</span>
            <span className="col-span-1">Port</span>
            <span className="col-span-2">Time</span>
            <span className="col-span-1"></span>
          </div>
          <table className="w-full">
            <tbody>
              {data.map((redisRow) => (
                <tr
                  key={redisRow.uuid}
                  className="grid w-full grid-cols-12 py-3 px-2 border-b border-neutral-700 text-sm"
                >
                  <td className="col-span-3">
                    <span className="bg-[#E4E7EB] font-medium px-2 py-1 rounded-md ">
                      {redisRow.content.key}
                    </span>
                  </td>
                  <td className="col-span-3">{redisRow.content.value}</td>
                  <td className="col-span-1">{redisRow.content.type}</td>
                  <td className="col-span-1">{redisRow.content.db}</td>
                  <td className="col-span-1">{redisRow.content.port}</td>
                  <td className="col-span-2">
                    {timeAgo(redisRow.content.time)}
                  </td>
                  <td className="col-span-1 ml-auto">
                    <Link
                      to={`${redisRow.uuid}`}
                      state={{ redisRowId: redisRow.uuid }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="#D1D5DA"
                        className="hover:fill-[#000]"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="my-6">
            <div className="flex items-center justify-center">
              {data.length === 0 ? (
                <div className="font-semibold px-4 py-2 text-sm rounded-md border border-[#00d061]">
                  No entries available
                </div>
              ) : noMoreItems ? (
                <div className="font-semibold px-4 py-2 text-sm rounded-md border border-[#00d061]">
                  No more entries
                </div>
              ) : (
                <button
                  onClick={() => getMoreItems()}
                  className="font-semibold px-4 py-2 text-sm rounded-md border border-[#00d061]"
                >
                  Load older entries
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
