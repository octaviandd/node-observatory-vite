/** @format */
import { Card, CardContent } from "@/components/ui/card"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  YAxis
} from "recharts"

type Props = {
  data: any[]
  period: string
  currentDate: string
}

export const DurationGraph = ({ data, period, currentDate }: Props) => {
  const formattedData = data.map((entry: any, index: number) => ({
    name: index,
    "Average Duration": entry.avgDuration,
    "95th Percentile": entry.p95,
    label: entry.label,
  }))

  // Calculate max value for domain
  const maxValue = Math.max(
    ...formattedData.map(d => Math.max(d["Average Duration"], d["95th Percentile"]))
  )

  return (
    <Card className="col-span-4 p-1 border-none shadow-none">
      <CardContent className="p-0">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{
                top: 20,
                right: 10,
                left: 0,
                bottom: 0,
              }}
              style={{ borderBottom: "1px solid #e0e0e0" }}
            >
              <YAxis
                domain={[0, maxValue * 1.1]} // Add 10% padding to top
                hide
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-sm border bg-background p-2 shadow-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {payload[0].payload.label}
                        </div>
                        {payload.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium">
                              {item.name}: {Number(item.value) > 999 ? (Number(item.value) / 1000).toFixed(2) + "s" : Number(item.value).toFixed(2) + "ms"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="Average Duration"
                stroke="#808080"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="95th Percentile"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-4">
          <span>{period}</span>
          <span>{currentDate}</span>
        </div>
      </CardContent>
    </Card>
  )
}
