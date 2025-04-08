/** @format */

import { FileCode } from "lucide-react";
import React from "react";
import SidePanel from "../../../components/ui/side-panel";
import { createPortal } from "react-dom";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function ViewsIndexTable() {
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
    key: "views",
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
          type="views"
        />
      )}
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm text-dark dark:text-white">
            {index === "instance"
              ? instanceDataCount
              : groupDataCount}{" "}
            {index === "instance" ? "View" : "Path"}
            {index === "instance" && Number(instanceDataCount) > 1 && "s"}
            {index === "group" && Number(groupDataCount) > 1 && "s"}
          </span>
          {!modelKey && (
            <div className="flex px-4 grow">
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "views" : "paths"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            </div>
          )}
        </div>
        {modelKey ? (
          <ToggleGroup
            type="single"
            value={instanceStatusType}
            onValueChange={(value) => value && setInstanceStatusType(value)}
          >
            <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">SHOW</span>
            {["all", "completed", "failed"].map((status) => (
              <ToggleGroupItem
                key={status}
                value={status}
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
