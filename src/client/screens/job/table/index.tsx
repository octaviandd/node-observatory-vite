/** @format */

import { Layers } from "lucide-react";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import SidePanel from "@/components/ui/side-panel";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function JobsIndexTable() {
  const { instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    sidePanelData,
    Table,
    message,
    handleSidePanel,
    setSidePanelData,
    setInstanceStatusType,
    setInputValue,
    loadData,
  } = useIndexTableData({
    key: "jobs",
    InstanceTable,
    GroupTable,
    defaultInstanceStatusType: "all",
    defaultGroupFilter: "all"
  })

  return (
    <div className="relative">
      {sidePanelData.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50"
            onClick={() =>
              setSidePanelData({ ...sidePanelData, isOpen: false, jobId: "", scheduleId: "", requestId: "", modelId: "" })
            }
          ></div>,
          document.body
        )}
      {sidePanelData.isOpen && (
        <SidePanel
          handleSidePanel={handleSidePanel}
          jobId={sidePanelData.jobId}
          scheduleId={sidePanelData.scheduleId}
          requestId={sidePanelData.requestId}
          modelId={sidePanelData.modelId}
          type="jobs"
        />
      )}
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm text-dark dark:text-white">
            {index === "group" ? groupDataCount : instanceDataCount}{" "}
            {index === "group" ? "Queues" : "ATTEMPTS"}
          </span>
          {index === "group" && (
            <div className="flex px-4 grow">
              <Input
                type="text"
                placeholder="Search queues"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {index === "instance" ? (
            <ToggleGroup type="single" value={instanceStatusType} onValueChange={(value) => value && setInstanceStatusType(value as any)}>
              <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">SHOW</span>
              {["all", "completed", "released", "failed"].map((status) => (
                <ToggleGroupItem
                  key={status}
                  value={status}
                  aria-label={status}
                  className="text-black cursor-pointer dark:text-white"
                >
                  {status.toUpperCase()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : (
            null
          )}
        </div>
      </div>
      <Table
        data={index === "instance" ? instanceData : groupData}
        handleSidePanel={handleSidePanel}
      >
        <div className="my-6">
          <div className="flex items-center justify-center">
            {message ? (
              <div className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-md">
                {message}
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={loadData}
                className="text-black"
              >
                Load older entries
              </Button>
            )}
          </div>
        </div>
      </Table>
    </div>
  );
}
