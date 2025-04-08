import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { StoreContext } from "@/store";
import { useParams } from 'react-router';

type Props = {
  key: string;
  InstanceTable: any;
  GroupTable: any;
  defaultInstanceStatusType: string;
  defaultGroupFilter: string;
}

export const useIndexTableData = ({key, InstanceTable,GroupTable, defaultInstanceStatusType}: Props) => {
  const { state } = useContext(StoreContext);
  const modelKey = useParams<{ key: string }>().key || "";

  const [instanceData, setInstanceData] = useState<any[]>([]);
  const [groupData, setGroupData] = useState<any[]>([]);

  const [instanceDataCount, setInstanceDataCount] = useState<string>("0");
  const [groupDataCount, setGroupDataCount] = useState<string>("0");

  const offsetRef = useRef(0);

  // UI States
  const [index, setIndex] = useState<"instance" | "group">("group");
  const [instanceStatusType, setInstanceStatusType] = useState<string>(defaultInstanceStatusType);

  const [inputValue, setInputValue] = useState("");
  const [noMoreItems, setNoMoreItems] = useState(false);
  const [sidePanelData, setSidePanelData] = useState({
    isOpen: false,
    modelId: "",
    requestId: "",
    jobId: "",
    scheduleId: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (index === 'instance') setInstanceStatusType(defaultInstanceStatusType);
    if (modelKey) setIndex("instance")
    else setIndex("group");
  }, [modelKey]);

  useEffect(() => {
    index === "instance" ? getDataByInstance() : getDataByGroup();
  }, [index, state.period, instanceStatusType, inputValue, modelKey]);

  const getDataByGroup = async (addedNewItems = false) => {
    if (addedNewItems) offsetRef.current += 20;

    const url = `/observatory-api/data/${key}?table=true&offset=${offsetRef.current}&index=${index}&period=${state.period
      }${inputValue ? `&q=${inputValue}` : ""}${instanceStatusType ? `&status=${instanceStatusType.split(",").map((status: string) => status.toLowerCase()).join(",")}` : ""}`;

    fetchData(url, addedNewItems, setGroupData, setGroupDataCount);
  };

  const getDataByInstance = async (addedNewItems = false) => {
    if (addedNewItems) offsetRef.current += 20;

    const url = `/observatory-api/data/${key}?table=true&offset=${offsetRef.current}&index=${index}&period=${state.period
      }${inputValue ? `&q=${inputValue}` : ""}${modelKey ? `&key=${modelKey}` : ""
      }&status=${instanceStatusType.toLowerCase()}`;

    fetchData(url, addedNewItems, setInstanceData, setInstanceDataCount);
  };

   const fetchData = async (
    url: string,
    addedNewItems: boolean,
    setData: Function,
    setCount: Function
   ) => {
     try {
      setLoading(true);
      const response = await fetch(url);
      const { results, count } = await response.json();

      setNoMoreItems(results.length < 20);

      setData(
        addedNewItems
          ? [...(index === "instance" ? instanceData : groupData), ...results]
          : results
      );
      setCount(count);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
     }
   };

  const Table = index === "instance" ? InstanceTable : GroupTable;
  const loadData =
    index === "instance"
      ? () => getDataByInstance(true)
      : () => getDataByGroup(true);

  const message = useMemo(() => {
    return index === "instance"
      ? instanceDataCount === "0"
        ? "No entries available"
        : noMoreItems
          ? "No more entries"
          : null
      : groupDataCount === "0"
        ? "No entries available"
        : noMoreItems
          ? "No more entries"
          : null;
  }, [index, instanceDataCount, groupDataCount, noMoreItems]);

  const handleSidePanel = (modelId = "", requestId = "", jobId = "", scheduleId = "") =>
    setSidePanelData({
      isOpen: !sidePanelData.isOpen,
      modelId: modelId || sidePanelData.modelId,
      requestId: requestId || sidePanelData.requestId,
      jobId: jobId || sidePanelData.jobId,
      scheduleId: scheduleId || sidePanelData.scheduleId,
    });

  return (
    {
      instanceData,
      groupData,
      instanceDataCount,
      groupDataCount,
      index,
      instanceStatusType,
      inputValue,
      sidePanelData,
      message,
      Table,
      modelKey,
      loading,
      offsetRef,
      setInputValue,
      loadData,
      handleSidePanel,
      setSidePanelData,
      setInstanceStatusType,
      setIndex,
    }
  )
}