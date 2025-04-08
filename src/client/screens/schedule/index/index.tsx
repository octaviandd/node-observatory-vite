/** @format */

import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import SchedulesIndexTable from "../table";
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { useIndexData } from "@/hooks/useIndexData";

export default function SchedulesIndex() {
  const { data, currentDate, period } = useIndexData({
    type: "schedules",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-muted-foreground">
                  RUNS
                </CardTitle>
                <CardSubtitle>
                  {data.count}
                </CardSubtitle>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground">COMPLETED</span>
                  <Badge variant="secondary" className="mt-1">
                    {data.indexCountOne}
                  </Badge>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground">FAILED</span>
                  <Badge variant="error" className="mt-1">
                    {data.indexCountTwo}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-auto">
              <CountGraph
                data={data.countFormattedData}
                barData={[
                  { dataKey: "completed", stackId: "a", fill: "#f1f5f9" },
                  { dataKey: "failed", stackId: "c", fill: "#ef4444" },
                ]}
                period={period}
                currentDate={currentDate}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-muted-foreground">
                  DURATION
                </CardTitle>
                <CardSubtitle>
                  {data.shortest} – {data.longest}
                </CardSubtitle>
              </div>
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground mr-1">AVG</span>
                  <Badge variant="secondary">
                    {data.average}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground mr-1">P95</span>
                  <Badge variant="warning">
                    {data.p95}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-auto">
              <DurationGraph data={data.durationFormattedData} period={period} currentDate={currentDate} />
            </div>
          </CardContent>
        </Card>
      </div>

      <SchedulesIndexTable />
    </div>
  );
}
