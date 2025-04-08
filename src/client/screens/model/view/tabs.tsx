import { Card, CardContent } from '@/components/ui/card'
import React from 'react'
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ModelInstanceResponse } from '../../../../../types'

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  data: {
    model: ModelInstanceResponse;
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
              lineProps={{
                style: {
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                },
              }}
              customStyle={{ margin: 0, borderRadius: 0 }}
            >
              {JSON.stringify(data.model, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}