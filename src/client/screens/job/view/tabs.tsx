import React from 'react'
import { CacheInstanceResponse, ExceptionInstanceResponse, JobInstanceResponse, MailInstanceResponse, ModelInstanceResponse, NotificationInstanceResponse, QueryInstanceResponse, HttpClientInstanceResponse, LogInstanceResponse } from '../../../../../types'
import { CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card } from '@/components/ui/card';

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  data: {
    job: JobInstanceResponse;
    notifications: NotificationInstanceResponse[];
    mails: MailInstanceResponse[];
    logs: LogInstanceResponse[];
    queries: QueryInstanceResponse[];
    caches: CacheInstanceResponse[];
    https: HttpClientInstanceResponse[];
    exceptions: ExceptionInstanceResponse[];
    models: ModelInstanceResponse[];
  }
}

export default function ContentTabs({ activeTab, setActiveTab, data }: Props) {
  return (
    <Card className="rounded-none">
      <CardContent className="p-0 rounded-none">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start rounded-none border-b">
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="mails">Mails</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="caches">Caches</TabsTrigger>
            <TabsTrigger value="https">Outgoing Requests</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
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
              {JSON.stringify(data.job, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="notifications" className="mt-0">
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
              {JSON.stringify(data.notifications, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="mails" className="mt-0">
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
              {JSON.stringify(data.mails, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="logs" className="mt-0">
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
              {JSON.stringify(data.logs, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="queries" className="mt-0">
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
              {JSON.stringify(data.queries, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="caches" className="mt-0">
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
              {JSON.stringify(data.caches, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="https" className="mt-0">
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
              {JSON.stringify(data.https, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="exceptions" className="mt-0">
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
              {JSON.stringify(data.exceptions, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
          <TabsContent value="models" className="mt-0">
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
              {JSON.stringify(data.models, null, 2)}
            </SyntaxHighlighter>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}