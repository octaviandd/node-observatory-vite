/** @format */

import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountGraph } from "@/components/ui/graphs/count-graph";
import ExceptionsIndexTable from "../table";
import { useIndexData } from "@/hooks/useIndexData";

export default function ExceptionsIndex() {
  const { data, currentDate, period } = useIndexData({
    type: "exceptions",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm text-muted-foreground">
                  EXCEPTIONS
                </CardTitle>
                <CardSubtitle>
                  {data.count}
                </CardSubtitle>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground">UNHANDLED</span>
                  <Badge variant="secondary" className="mt-1">
                    {data.indexCountOne}
                  </Badge>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground">UNCAUGHT</span>
                  <Badge variant="warning" className="mt-1">
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
                  {
                    dataKey: "unhandledRejection",
                    stackId: "a",
                    fill: "#f1f5f9",
                  },
                  {
                    dataKey: "uncaughtException",
                    stackId: "b",
                    fill: "#ffc658",
                  },
                ]}
                period={period}
                currentDate={currentDate}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ExceptionsIndexTable />
    </div>
  );
}
