/** @format */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { timeAgo } from "@/utils.js";

export default function SchedulePreview() {
  // const params = useParams();
  // const [job, setJob] = useState<ScheduleResponse | null>(null);
  // const [notifications, setNotifications] = useState<any[]>([]);
  // const [mails, setMails] = useState<any[]>([]);
  // const [logs, setLogs] = useState<any[]>([]);
  // const [queries, setQuery] = useState<any[]>([]);
  // const [https, setHttp] = useState<any[]>([]);
  // const [caches, setCache] = useState<any[]>([]);

  // const [tabs, setTabs] = useState([
  //   {
  //     id: 0,
  //     title: "Payload",
  //     active: true,
  //   },
  //   {
  //     id: 1,
  //     title: "Headers",
  //     active: false,
  //   },
  //   {
  //     id: 2,
  //     title: "Session",
  //     active: false,
  //   },
  // ]);

  // useEffect(() => {
  //   getItem();
  // }, []);

  // const getItem = async () => {
  //   const response = await fetch(`/api/data/jobs/${params.requestId}`);
  //   const data = await response.json();

  //   const { query, http, job, cache, notification, mail, logs } = data;
  //   query && setQuery(query);
  //   http && setHttp(http);
  //   job && setJob(job);
  //   cache && setCache(cache);
  //   notification && setNotifications(notification);
  //   mail && setMails(mail);
  //   logs && setLogs(logs);
  // };

  // if (!job) return <div>Loading</div>;

  return (
    <div>
      <div className="flex flex-col shadow-md">
        <div className="">
          <div className="bg-white h-full w-full px-4 py-3">
            <span>Schedule Details</span>
          </div>
        </div>
        {/* <div className="px-3">
          <div className="flex flex-col gap-y-4 py-4">
            <div className="grid items-center grid-cols-12">
              <div className="col-span-4 text-[#5c5f65]">Time</div>
              <div className="col-span-8">
                {new Date(schedule.content.time).toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                })}{" "}
                ({timeAgo(schedule.content.time)})
              </div>
            </div>
            <div className="grid items-center grid-cols-12">
              <div className="col-span-4 text-[#5c5f65]">Name</div>
              <div className="col-span-8">{schedule.content.name}</div>
            </div>
            <div className="grid items-center grid-cols-12">
              <div className="col-span-4 text-[#5c5f65]">Recurrence</div>
              <div className="col-span-8">
                <span className="font-medium px-2 py-1 rounded-md">
                  {schedule.content.info}
                </span>
              </div>
            </div>
            <div className="grid items-center grid-cols-12">
              <div className="col-span-4 text-[#5c5f65]">Mode</div>
              <div className="col-span-8">
                <span
                  className={`px-2 py-1 rounded-md ${
                    schedule.content.mode === "cancel"
                      ? "bg-red-300"
                      : "bg-[#D1FAE4]"
                  }`}
                >
                  {schedule.content.mode}
                </span>
              </div>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
