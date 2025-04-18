import * as React from "react"
import { memo } from "react"
import {
  ArrowUpDown,
  Bell,
  Blocks,
  BookOpen,
  Bug,
  CalendarCheck,
  Database,
  DatabaseZap,
  File,
  Globe,
  Layers,
  Logs,
  Mail,
  Settings2,
  SquareActivity,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { AppSettings } from "@/components/app-settings"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from "react-router"

// This is sample data.
const data = {
  user: {
    name: "octavian",
    email: "octavian@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  dashboard: {
    title: "Dashboard",
    url: "/",
    icon: SquareTerminal,
  },
  navMain: [
    {
      title: "Activity",
      url: "#",
      icon: SquareActivity, 
      isActive: true,
      items: [
        {
          title: "Requests",
          url: "/requests",
          icon: ArrowUpDown
        },
        {
          title: "Jobs",
          url: "/jobs",
          icon: Layers,
        },
        {
          title: "Schedules",
          url: "/schedules",
          icon: CalendarCheck,
        },
        {
          title: "Queries",
          url: "/queries",
          icon: Database,
        },
        {
          title: "Notifications",
          url: "/notifications",
          icon: Bell,
        },
        {
          title: "Mails",
          url: "/mails",
          icon: Mail,
        },
        {
          title: "Outgoing Requests",
          url: "/https",
          icon: Globe,
        },
      ],
    },
    {
      title: "Errors",
      url: "#",
      icon: BookOpen,
      isActive: true,
      items: [
        {
          title: "Exceptions",
          url: "/exceptions",
          icon: Bug,
        },
        // {
        //   title: "Alerts",
        //   url: "/alerts",
        //   icon: CircleAlert,
        // },
      ],
    },
    {
      title: "Monitoring",
      url: "#",
      icon: Settings2,
      isActive: true,
      items: [
        {
          title: "Cache",
          url: "/caches",
          icon: DatabaseZap,
        },
        {
          title: "Logs",
          url: "/logs",
          icon: Logs,
        },
        {
          title: "Models",
          url: "/models",
          icon: Blocks,
        },
        // {
        //   title: "Redis",
        //   url: "/redis",
        //   icon: Layers,
        // },
        {
          title: "Views",
          url: "/views",
          icon: File
        },
      ],
    },
  ],
}

export const AppSidebar = memo(({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-4 py-5 text-2xl font-semibold border-b">
          <img src="/images/neural-network.png" alt="" className="w-8" />
          <span>Observatory</span>
        </Link>
        <Link to="/" className="flex items-center text-lg gap-2 px-2 py-2">
          {data.dashboard.icon && <data.dashboard.icon className="w-4 h-4" />}
          <span>{data.dashboard.title}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <AppSettings />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
});
