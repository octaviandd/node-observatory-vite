/** @format */
import RequestIndexTable from "../table/index";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import { DurationGraph } from "@/components/ui/graphs/duration-graph";
import { useIndexData } from "@/hooks/useIndexData";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RequestsIndex() {
  const { data, currentDate, period } = useIndexData({
    type: "requests",
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                REQUESTS
              </CardTitle>
              <CardSubtitle>
                {data.count}
              </CardSubtitle>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex flex-col items-center">
                <span className="text-muted-foreground">1/2/3XX</span>
                <Badge variant="secondary" className="mt-1">
                  {data.indexCountOne}
                </Badge>
              </div>
              <div className="flex flex-col items-center text-yellow-600">
                <span className="text-muted-foreground">4XX</span>
                <Badge variant="warning" className="mt-1">
                  {data.indexCountTwo}
                </Badge>
              </div>
              <div className="flex flex-col items-center text-red-500">
                <span className="text-muted-foreground">5XX</span>
                <Badge variant="destructive" className="mt-1">
                  {data.indexCountThree}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-auto">
              <CountGraph
                data={data.countFormattedData}
                barData={[
                  { dataKey: "200", stackId: "a", fill: document.documentElement.classList.contains("dark") ? "#242427" : "#f1f5f9" },
                  { dataKey: "400", stackId: "b", fill: "#ffc658" },
                  { dataKey: "500", stackId: "c", fill: "#ef4444" },
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
                {data.shortest} – {data.longest}
              </CardSubtitle>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">AVG</span>
                <Badge variant="secondary">{data.average}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">P95</span>
                <Badge variant="warning">{data.p95}</Badge>
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

      <div className="flex flex-col gap-4">
        <RequestIndexTable />
      </div>
    </div>
  );
}
