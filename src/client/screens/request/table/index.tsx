/** @format */

import { ArrowUpDown } from "lucide-react";
import SidePanel from "../../../components/ui/side-panel";
import { createPortal } from "react-dom";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { memo } from "react";

export default function RequestIndexTable() {
  const { instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    sidePanelData,
    Table,
    modelKey,
    message,
    handleSidePanel,
    setSidePanelData,
    setInstanceStatusType,
    setIndex,
    setInputValue,
    loadData,
  } = useIndexTableData({
    key: "requests",
    InstanceTable,
    GroupTable,
    defaultInstanceStatusType: "all",
    defaultGroupFilter: "all"
  })

  return (
    <div className="relative">
      <SidePanelOpener sidePanelData={sidePanelData} setSidePanelData={setSidePanelData} handleSidePanel={handleSidePanel} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-black dark:text-white">
            {index === "instance" ? instanceDataCount : groupDataCount}{" "}
            {index === "instance" ? "Request" : "Route"}
            {(index === "instance" ? parseFloat(instanceDataCount) : parseFloat(groupDataCount)) > 1 ? "s" : ""}
          </span>
          {!modelKey && (
            <div className="flex px-4 grow">
              <Input
                placeholder={`Search ${index === "instance" ? "requests" : "routes"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
                />
            </div>
          )}
        </div>
        <Toggles modelKey={modelKey} instanceStatusType={instanceStatusType} index={index} setInstanceStatusType={setInstanceStatusType} setIndex={setIndex} />
      </div>
      <Table
        data={index === "instance" ? instanceData : groupData}
        handleSidePanel={handleSidePanel}
      >
        <div className="flex justify-center my-2">
          {message ? (
            <Button variant="outline" className="text-muted-foreground" disabled>
              {message}
            </Button>
          ) : (
            <Button variant="outline" className="text-muted-foreground" onClick={loadData}>
              Load older entries
            </Button>
          )}
        </div>
      </Table>
    </div>
  );
}

const Toggles = memo(({ modelKey, instanceStatusType, index, setInstanceStatusType, setIndex }: { modelKey: string, instanceStatusType: string, index: string, setInstanceStatusType: (value: string) => void, setIndex: (value: "instance" | "group") => void }) => {
  return (
    <div className="flex items-center gap-4">
      {modelKey ? (
        <ToggleGroup type="single" value={instanceStatusType} onValueChange={(value) => value && setInstanceStatusType(value as any)}>
          <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">SHOW</span>
          {["all", "2xx", "4xx", "5xx"].map((status) => (
            <ToggleGroupItem key={status} value={status} aria-label={status} className="text-black cursor-pointer dark:text-white">
              {status.toUpperCase()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        null
      )}
    </div>
  )
})

const SidePanelOpener = memo(({ sidePanelData, setSidePanelData, handleSidePanel }: { sidePanelData: any, setSidePanelData: (value: any) => void, handleSidePanel: (value: any) => void }) => {
  return (
    <>
    {sidePanelData.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50"
            onClick={() =>
              setSidePanelData({ ...sidePanelData, isOpen: false, requestId: "", jobId: "", scheduleId: "", modelId: "" })
            }
          ></div>,
          document.body
        )}
      {sidePanelData.isOpen && (
        <SidePanel
          handleSidePanel={handleSidePanel}
          requestId={sidePanelData.requestId}
          jobId={sidePanelData.jobId}
          scheduleId={sidePanelData.scheduleId}
          modelId={sidePanelData.modelId}
          type="requests"
        />
      )}
    </>
  )
})