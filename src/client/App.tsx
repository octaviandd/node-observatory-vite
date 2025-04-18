import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Outlet, useLocation } from "react-router"
import { useContext, useEffect, useState } from "react";
import { StoreContext } from "@/store";
import { Moon, RefreshCcw, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type TimePeriod = "1h" | "24h" | "7d" | "14d" | "30d";

export default function MainLayout() {
  const location = useLocation();
  const isPreviewRoute = /\/(mail|exception|log|notification|job|cache|query|model|request|schedule|http|view)\/[^\/]+$/.test(location.pathname);

  const handleRefresh = () => {
    fetch(`/api/data/${location.pathname}/refresh`)
      .then(res => res.json())
      .then(data => {
        // console.log(data);
      });
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        {!isPreviewRoute && (
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12  pr-10">
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="h-9 w-9"
              >
                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              </Button>
              <PeriodSelector />
            </div>
          </header>
        )}
        <div className="p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

const PeriodSelector = () => {
  const { state, dispatch } = useContext(StoreContext);
  const setPeriod = (period: "1h" | "24h" | "7d" | "14d" | "30d") => {
    window.localStorage.setItem("period", period);
    dispatch({ type: "setPeriod", payload: period });
  };  

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("theme") !== "dark") {
      window.localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark")
    } else {
      window.localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  const timePeriods: TimePeriod[] = ["1h", "24h", "7d", "14d", "30d"];
  return (
    <>
      <div className="inline-flex h-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {timePeriods.map((period, index) => (
          <Button
            key={period}
            variant={state.period === period ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriod(period)}
            className={`px-3 rounded-none ${index === 0 ? "rounded-l-md" : index === timePeriods.length - 1 ? "rounded-r-md" : ""}`}
          >
            {period.toUpperCase()}
          </Button>
        ))}
      </div>
      <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4" />
      <Switch
        id="dark-mode"
        checked={isDarkMode}
        onCheckedChange={setIsDarkMode}
      />
      <Moon className="h-4 w-4" />
      <Label htmlFor="dark-mode" className="sr-only">
        Toggle dark mode
      </Label>
    </div>
    </>
  )
}
