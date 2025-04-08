/** @format */

import { StoreContext } from "@/store";
import { CountGraph } from "../ui/graphs/count-graph";
import { DurationGraph } from "../ui/graphs/duration-graph";
import { Link } from "react-router";
import { useIndexData } from "@/hooks/useIndexData";
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRightCircle,
  LayoutDashboard,
  AlertTriangle,
  ArrowUpDown,
  Database,
  SquareActivity,
} from "lucide-react";
import React from "react";
import { formatDuration, formatCount } from "@/utils";

export default function Dashboard() {
  const { data: requests, currentDate, period } = useIndexData({ type: "requests" });
  const { data: exceptions } = useIndexData({ type: "exceptions" });
  const { data: jobs } = useIndexData({ type: "jobs" });
  const { state } = React.useContext(StoreContext);
  const [groupedRequests, setGroupedRequests] = React.useState<any[]>([]);
  const [groupedQueries, setGroupedQueries] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch(`/observatory-api/data/requests?table=true&offset=0&index=group&period=${state.period}`)
      .then(res => res.json())
      .then(data => {
        // console.log(data)
        setGroupedRequests(data.results);
      })
  }, [state.period])

  React.useEffect(() => {
    fetch(`/observatory-api/data/queries?table=true&offset=0&index=group&period=${state.period}`)
      .then(res => res.json())
      .then(data => {
        // console.log(data)
        setGroupedQueries(data.results);
      })
  }, [state.period])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pt-2 pb-1 px-2">
          <div className="flex items-center gap-2">
            <SquareActivity className="h-5 w-5" />
            <CardTitle>Activity</CardTitle>
          </div>
          <Button variant="outline" asChild>
            <Link to="/requests" className="flex items-center gap-2">
              REQUESTS
              <ArrowRightCircle className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    REQUESTS
                  </CardTitle>
                  <CardSubtitle>
                    {requests.count}
                  </CardSubtitle>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">1/2/3XX</span>
                    <Badge variant="secondary" className="mt-1">
                      {requests.indexCountOne}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">4XX</span>
                    <Badge variant="warning" className="mt-1">
                      {requests.indexCountTwo}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground">5XX</span>
                    <Badge variant="destructive" className="mt-1">
                      {requests.indexCountThree}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-auto">
                  <CountGraph
                    data={requests.countFormattedData}
                    barData={[
                      { dataKey: "200", stackId: "a", fill: "#808080" },
                      { dataKey: "400", stackId: "b", fill: "#ffc658" },
                      { dataKey: "500", stackId: "c", fill: "#ff8042" },
                    ]}
                    period={period}
                    currentDate={currentDate}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    DURATION
                  </CardTitle>
                  <CardSubtitle>
                    {requests.shortest} – {requests.longest}
                  </CardSubtitle>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">AVG</span>
                    <Badge variant="secondary" className="">
                      {requests.average}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">P95</span>
                    <Badge variant="warning" className="">
                      {requests.p95}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-auto">
                  <DurationGraph
                    data={requests.durationFormattedData}
                    period={period}
                    currentDate={currentDate}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pt-2 pb-1 px-2">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            <CardTitle>Application</CardTitle>
          </div>
          <Button variant="outline" asChild>
            <Link to="/jobs" className="flex items-center gap-2">
              JOBS
              <ArrowRightCircle className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    EXCEPTIONS
                  </CardTitle>
                </div>
                <CardSubtitle>
                  {exceptions.count} exceptions were logged in the last{" "}
                  {state.period === "7d"
                    ? "7 days"
                    : state.period === "14d"
                      ? "14 days"
                      : state.period === "30d"
                        ? "30 days"
                        : state.period === "24h"
                          ? "24 hours"
                          : "1 hour"}.
                </CardSubtitle>
              </CardHeader>
              <CardContent>
                <div className="h-auto">
                  <CountGraph
                    data={exceptions.countFormattedData}
                    barData={[
                      {
                        dataKey: "unhandledRejection",
                        stackId: "a",
                        fill: "#f1f5f9",
                      },
                      {
                        dataKey: "uncaughtException",
                        stackId: "b",
                        fill : "#ffc658",
                      },
                    ]}
                    period={period}
                    currentDate={currentDate}   
                  />
                </div>

                {exceptions.count > 0 && (
                  <Button variant="outline" asChild className="w-full mt-4">
                    <Link to="/exceptions" className="flex items-center justify-center gap-2">
                      View Details
                    <ArrowRightCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 grid-rows-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      REQUESTS
                    </CardTitle>
                  </div>
                  <CardSubtitle>
                    {formatCount(groupedRequests.filter(request => request.average > 1000).length)} routes are slower than 1000ms.
                  </CardSubtitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {groupedRequests
                      .filter(request => request.average > 1000)
                      .slice(0, 3)
                      .map((request, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                          <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground">
                              {request.content.route}
                            </span>
                          </div>
                          <span className="text-sm text-yellow-600">
                            {formatDuration(request.average)}
                          </span>
                        </div>
                      ))}
                  </div>
                  {groupedRequests.filter(request => request.average > 1000).length > 1 && (
                    <Button variant="outline" asChild className="w-full mt-4">
                      <Link to="/requests" className="flex items-center justify-center gap-2">
                        View Details
                      <ArrowRightCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      QUERIES
                    </CardTitle>
                  </div>
                  <CardSubtitle>
                    {formatCount(groupedQueries.filter(query => query.p95 > 1000).length)} endpoints are slower than 1000ms.
                  </CardSubtitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {groupedQueries
                      .filter(query => query.p95 > 1000)
                      .slice(0, 3)
                      .map((query, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                          <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground">
                              {query.content.endpoint}
                            </span>
                          </div>
                          <span className="text-sm text-yellow-600">
                            {formatDuration(query.content.average)}
                          </span>
                        </div>
                      ))}
                  </div>

                  {groupedQueries.filter(query => query.p95 > 1000).length > 1 && (
                    <Button variant="outline" asChild className="w-full mt-4">
                      <Link to="/queries" className="flex items-center justify-center gap-2">
                        View Details
                      <ArrowRightCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex text-xs">
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-muted-foreground">JOB ATTEMPTS</span>
                    <span className="font-medium">
                      {jobs.count}
                    </span>
                  </div>
                </div>
                <div className="flex text-xs gap-x-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">COMPLETED</span>
                    <span className="font-medium text-[#f1f5f9]">
                      {jobs.indexCountOne}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">RELEASED</span>
                    <span className="font-medium text-[#ffc658]">
                      {jobs.indexCountTwo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">FAILED</span>
                    <span className="font-medium text-destructive">
                      {jobs.indexCountThree}
                    </span>
                  </div>
                </div>

              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-auto">
                  <CountGraph
                    data={jobs.countFormattedData}
                    barData={[
                      { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
                      { dataKey: "released", stackId: "b", fill: "#ffc658" },
                      { dataKey: "failed", stackId: "c", fill: "#ef4444" },
                    ]}
                    period={period}
                    currentDate={currentDate}
                  />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">JOBS DURATION</p>
                  <CardSubtitle>
                    {jobs.shortest} – {jobs.longest}
                  </CardSubtitle>
                  <div className="h-auto">
                    <DurationGraph
                      data={jobs.durationFormattedData}
                      period={period}
                      currentDate={currentDate}
                    />
                  </div>
                  
                </div>

                <Button variant="outline" asChild className="w-full">
                  <Link to="/jobs" className="flex items-center justify-center gap-2">
                    View Details
                    <ArrowRightCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
