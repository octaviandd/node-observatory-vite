/** @format */

import { DatabaseZap } from "lucide-react";
import SidePanel from "../../../components/ui/side-panel";
import { createPortal } from "react-dom";
import InstanceTable from "./instance";
import GroupTable from "./group";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { ToggleGroupItem } from "@/components/ui/toggle-group";

export default function CacheIndexTable() {
  const {
    instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    instanceStatusType,
    inputValue,
    sidePanelData,
    message,
    modelKey,
    Table,
    setInputValue,
    setSidePanelData,
    handleSidePanel,
    setInstanceStatusType,
    loadData,
  } = useIndexTableData({
    key: "cache",
    InstanceTable,
    GroupTable,
    defaultInstanceStatusType: "all",
    defaultGroupFilter: "all"
  });

  return (
    <div className="relative">
      {sidePanelData.isOpen && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-xs z-50"
          onClick={() => setSidePanelData({ ...sidePanelData, isOpen: false, requestId: "", jobId: "", scheduleId: "", modelId: "" })}
        ></div>,
        document.body
      )}
      {sidePanelData.isOpen && (
        <SidePanel
          handleSidePanel={handleSidePanel}
          modelId={sidePanelData.modelId}
          requestId={sidePanelData.requestId}
          jobId={sidePanelData.jobId}
          scheduleId={sidePanelData.scheduleId}
          type="cache"
        />
      )}
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <DatabaseZap className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm text-dark dark:text-white">
            {index === "instance" ? instanceDataCount : groupDataCount}{" "}
            {index === "instance" ? "Transaction" : "Key"}
            {index === "instance" && Number(instanceDataCount) > 1 && "s"}
            {index === "group" && Number(groupDataCount) > 1 && "s"}
          </span>
          <div className="flex px-4 grow">
            {!modelKey && (
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "transactions" : "keys"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            )}
          </div>
        </div>
        {!modelKey ? (
          null
        ) : (
          <ToggleGroup
            type="single"
            value={instanceStatusType}
            onValueChange={(value) => value && setInstanceStatusType(value)}
          >
            <span className="text-sm text-muted-foreground border rounded-md px-2 py-1">SHOW</span>
            <ToggleGroupItem value="all" className="text-black cursor-pointer dark:text-white">
              ALL
            </ToggleGroupItem>
            <ToggleGroupItem value="hits" className="text-black cursor-pointer dark:text-white">
              HITS
            </ToggleGroupItem>
            <ToggleGroupItem value="misses" className="text-black cursor-pointer dark:text-white">
              MISSES
            </ToggleGroupItem>
            <ToggleGroupItem value="writes" className="text-black cursor-pointer dark:text-white">
              WRITES
            </ToggleGroupItem>
          </ToggleGroup>
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
