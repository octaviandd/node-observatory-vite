/** @format */
import { scan } from "react-scan";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router";
import MailsIndex from "./screens/mail/index";
import MailPreview from "./screens/mail/view/view";
import ExceptionIndex from "./screens/exception/index";
import ExceptionPreview from "./screens/exception/view/view";
import NotificationsIndex from "./screens/notification/index";
import NotificationPreview from "./screens/notification/view/view";
import JobsIndex from "./screens/job/index";
import JobPreview from "./screens/job/view/view";
import CacheIndex from "./screens/cache/index";
import CachePreview from "./screens/cache/view/view";
import QueriesIndex from "./screens/query/index";
import QueryPreview from "./screens/query/view/view";
import ModelsIndex from "./screens/model/index";
import ModelPreview from "./screens/model/view/view";
import RequestsIndex from "./screens/request/index/index";
import RequestView from "./screens/request/view/view";
import ScheduleIndex from "./screens/schedule/index";
import SchedulePreview from "./screens/schedule/view/view";
import HttpIndex from "./screens/http/index";
import HttpPreview from "./screens/http/view/view";
import LogIndex from "./screens/log/index";
import LogPreview from "./screens/log/view/view";
import ViewsIndex from "./screens/view/index/index";
import ViewPreview from "./screens/view/view/view";
import AlertsIndex from "./screens/alerts/index";
import Dashboard from "./components/ui/dashboard";
import { StoreProvider } from "./store";
import MainLayout from "./App";
import { ScrollArea } from "@/components/ui/scroll-area";


scan({
  enabled: !import.meta.env.PROD,
})

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <div>404</div>,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "/alerts",
        element: <AlertsIndex />,
      },
      {
        path: "/mails",
        element: <MailsIndex />,
      },
      {
        path: "/mails/:key",
        element: <MailsIndex />,
      },
      {
        path: "/mail/:id",
        element: <MailPreview />,
      },
      {
        path: "/exceptions",
        element: <ExceptionIndex />,
      },
      {
        path: "/exceptions/:key",
        element: <ExceptionIndex />,
      },
      {
        path: "/exception/:id",
        element: <ExceptionPreview />,
      },
      {
        path: "/logs",
        element: <LogIndex />,
      },
      {
        path: "/logs/:key",
        element: <LogIndex />,
      },
      {
        path: "/log/:id",
        element: <LogPreview />,
      },
      {
        path: "/notifications",
        element: <NotificationsIndex />,
      },
      {
        path: "/notifications/:key",
        element: <NotificationsIndex />,
      },
      {
        path: "/notification/:id",
        element: <NotificationPreview />,
      },
      {
        path: "/jobs",
        element: <JobsIndex />,
      },
      {
        path: "/jobs/:key",
        element: <JobsIndex />,
      },
      {
        path: "/job/:id",
        element: <JobPreview />,
      },
      {
        path: "/caches",
        element: <CacheIndex />,
      },
      {
        path: "/caches/:key",
        element: <CacheIndex />,
      },
      {
        path: "/cache/:id",
        element: <CachePreview />,
      },
      {
        path: "/queries",
        element: <QueriesIndex />,
      },
      {
        path: "/queries/:key",
        element: <QueriesIndex />,
      },
      {
        path: "/query/:id",
        element: <QueryPreview />,
      },
      {
        path: "/models",
        element: <ModelsIndex />,
      },
      {
        path: "/models/:key",
        element: <ModelsIndex />,
      },
      {
        path: "/model/:id",
        element: <ModelPreview />,
      },
      {
        path: "/requests",
        element: <RequestsIndex />,
      },
      {
        path: "/requests/:key",
        element: <RequestsIndex />,
      },
      {
        path: "/request/:id",
        element: <RequestView />,
      },
      {
        path: "/schedules",
        element: <ScheduleIndex />,
      },
      {
        path: "/schedules/:key",
        element: <ScheduleIndex />,
      },
      {
        path: "/schedule/:id",
        element: <SchedulePreview />,
      },
      {
        path: "/https",
        element: <HttpIndex />,
      },
      {
        path: "/https/:key",
        element: <HttpIndex />,
      },
      {
        path: "/http/:id",
        element: <HttpPreview />,
      },
      {
        path: "/views",
        element: <ViewsIndex />,
      },
      {
        path: "/views/:key",
        element: <ViewsIndex />,
      },
      {
        path: "/view/:id",
        element: <ViewPreview />,
      }
    ],
  },
]);

createRoot(document.getElementById("root") as HTMLDivElement).render(
  <StrictMode>
    <StoreProvider>
      <ScrollArea className="h-[calc(100vh-0.1px)]">
        <RouterProvider router={router}></RouterProvider>
      </ScrollArea>
    </StoreProvider>
  </StrictMode>
);
