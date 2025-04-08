import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { TabsContent, TabsTrigger, TabsList, Tabs } from '@/components/ui/tabs'
import { LogInstanceResponse } from '../../../../../types'
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  data: {
    log: LogInstanceResponse;
  }
}

export default function ContentTabs({ activeTab, setActiveTab, data }: Props) {
  return (
    <Card className="rounded-none">
      <CardContent className="p-0 rounded-none">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start rounded-none border-b">
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>
          <TabsContent value="raw" className="mt-0">
            <SyntaxHighlighter
              language="json"
              style={materialDark}
              wrapLines={true}
              wrapLongLines={true}
              customStyle={{ margin: 0, borderRadius: 0 }}
              lineProps={{
                style: {
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                },
              }}
            >
              {JSON.stringify(data.log, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}