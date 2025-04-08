/** @format */

import { Logs } from "lucide-react";
import SidePanel from "../../../components/ui/side-panel";
import { createPortal } from "react-dom";
import { InstanceTable } from "./instance";
import { GroupTable } from "./group";
import { useIndexTableData } from "@/hooks/useIndexTableData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LogsIndexTable() {
  const { instanceData,
    groupData,
    instanceDataCount,
    groupDataCount,
    index,
    inputValue,
    sidePanelData,
    Table,
    modelKey,
    message,
    handleSidePanel,
    setSidePanelData,
    setInputValue,
    loadData,
  } = useIndexTableData({
    key: "logs",
    InstanceTable,
    GroupTable,
    defaultInstanceStatusType: "all",
    defaultGroupFilter: "all"
  })

  // const [dropdownOpen, setDropdownOpen] = useState(false);
  // const [logTypes, setLogTypes] = useState<any>([
  //   { label: "All", checked: true },
  //   { label: "Info", checked: false },
  //   { label: "Warn", checked: false },
  //   { label: "Error", checked: false },
  //   { label: "Debug", checked: false },
  //   { label: "Trace", checked: false },
  //   { label: "Fatal", checked: false },
  //   { label: "Log", checked: false },
  // ]);

  // const handleLogTypeChange = (label: string) => {
  //   let log = logTypes.find((t: any) => t.label === label);

  //   if (log) {
  //     log.checked = !log.checked;
  //   }

  //   setLogTypes([...logTypes]);
  //   setInstanceStatusType(logTypes.filter((t: any) => t.checked).map((t: any) => t.label).join(","));
  // };


  return (
    <div className="relative">
      {sidePanelData.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-xs z-50"
            onClick={() =>
              setSidePanelData({ ...sidePanelData, isOpen: false, modelId: "", requestId: "", jobId: "", scheduleId: "" })
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
          type="logs"
        />
      )}
      <div className="py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <Logs className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-dark dark:text-white">
            {index === "instance" ? instanceDataCount : groupDataCount}{" "}
            {index === "instance" ? "Log" : "Source"}
          </span>
          <div className="flex px-4 grow">
            {!modelKey && (
              <Input
                type="text"
                placeholder={`Search ${index === "instance" ? "logs" : "log sources"}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-[300px] text-muted-foreground"
              />
            )}
          </div>
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
