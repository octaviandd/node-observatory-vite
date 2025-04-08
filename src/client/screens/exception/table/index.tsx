/** @format */

import { Bug } from "lucide-react";
import SidePanel from "../../../components/ui/side-panel";
import { createPortal } from "react-dom";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function ExceptionsIndexTable() {
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
    setInputValue,
    loadData,
  } = useIndexTableData({
    key: "exceptions",
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
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-xs z-50"
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
          type="exceptions"
        />
      )}
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm text-dark dark:text-white">
            {index === "instance" ? instanceDataCount : groupDataCount}{" "}
            {index === "instance" ? "Exception" : "Type"}
            {index === "instance" && Number(instanceDataCount) > 1 && "s"}
            {index === "group" && Number(groupDataCount) > 1 && "s"}
          </span>
        </div>
        <div className="flex px-4 grow">
          {!modelKey && (
            <Input
              type="text"
              placeholder="Search exceptions"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-[300px] text-muted-foreground"
            />
          )}
        </div>
        {modelKey ? (
          <ToggleGroup
            type="single"
            value={instanceStatusType}
            onValueChange={(value) => value && setInstanceStatusType(value)}
          >
            <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">SHOW</span>
            {["ALL", "UNHANDLED", "UNCAUGHT"].map((label, index) => (
              <ToggleGroupItem
                key={index}
                value={label.toLowerCase()}
                className="text-black cursor-pointer dark:text-white"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : (
          null
        )}
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
