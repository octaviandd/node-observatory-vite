import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sliders } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function AppSettings() {
  const [refreshRate, setRefreshRate] = useState("60");
  const [ignoredRoutes, setIgnoredRoutes] = useState("/health, /metrics, /api/internal/*");
  
  const [mailProviders, setMailProviders] = useState([
    "nodemailer",
    "@aws-sdk/client-ses",
    "mailgun.js"
  ]);
  
  const [databaseORMs, setDatabaseORMs] = useState([
    "mongoose",
    "prisma"
  ]);
  
  const [watchers, setWatchers] = useState({
    requests: true,
    queries: true,
    jobs: true,
    schedules: true,
    notifications: true,
    mails: true,
    logs: true,
    views: true,
    cache: true,
    http: true,
    exceptions: true,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <Sliders className="w-4 h-4" />
          <span>Application Settings</span>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="watchers">Watchers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <div className="flex-1 bg-background rounded-lg border shadow-md mt-4">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="font-medium text-sm">Configuration Panel</div>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium block text-muted-foreground">Auto Refresh Rate</label>
                  <select 
                    className="w-full text-xs p-2 rounded-md bg-muted/50 border"
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(e.target.value)}
                  >
                    <option value="0">Disabled</option>
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                    <option value="300">5 minutes</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium block text-muted-foreground">Ignored Routes</label>
                  <div className="relative">
                    <Input 
                      type="text" 
                      placeholder="/health, /metrics, /api/internal/*" 
                      className="w-full text-xs p-2 rounded-md bg-muted/50 border"
                      value={ignoredRoutes}
                      onChange={(e) => setIgnoredRoutes(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button className="text-xs bg-primary text-primary-foreground rounded-md px-2.5 py-1.5 font-medium">
                    Save Configuration
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="integrations">
            <div className="flex-1 bg-background rounded-lg border shadow-md mt-4">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="font-medium text-sm">Configuration Panel</div>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium block text-muted-foreground">Mail Providers</label>
                  <div className="flex flex-wrap gap-1">
                    {mailProviders.map((provider, index) => (
                      <span key={index} className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded px-2 py-1">
                        {provider}
                      </span>
                    ))}
                    <span className="bg-muted text-muted-foreground text-xs rounded px-2 py-1 cursor-pointer">
                      + Add
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium block text-muted-foreground">Database ORM</label>
                  <div className="flex flex-wrap gap-1">
                    {databaseORMs.map((orm, index) => (
                      <span key={index} className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded px-2 py-1">
                        {orm}
                      </span>
                    ))}
                    <span className="bg-muted text-muted-foreground text-xs rounded px-2 py-1 cursor-pointer">
                      + Add
                    </span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button className="text-xs bg-primary text-primary-foreground rounded-md px-2.5 py-1.5 font-medium">
                    Save Configuration
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="watchers">
            <div className="flex-1 bg-background rounded-lg border shadow-md mt-4">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <div className="font-medium text-sm">Active Watchers</div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(watchers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={value}
                        onChange={() => setWatchers({
                          ...watchers,
                          [key]: !value,
                        })}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={key} className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {key}
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4">
                  <Button className="text-xs bg-primary text-primary-foreground rounded-md px-2.5 py-1.5 font-medium">
                    Save Configuration
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 