import { Request, Response } from "express";

export interface WatcherEntry {
  uuid: string;
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
  type: string;
  content: string;
  created_at: number | Date;
}

export interface WatcherFilters {
  period?: "1h" | "24h" | "7d" | "14d" | "30d";
  offset: number;
  limit: number;
  isTable: boolean;
  query?: string;
  index: string;
}

interface Watcher {
  readonly type: string;
  refreshInterval: NodeJS.Timeout | undefined;
  getIndex(req: Request, res: Response): Promise<Response>;
  getView(req: Request, res: Response): Promise<Response>;
  addContent(content: unknown): Promise<void>;
  handleAdd(entry: WatcherEntry): Promise<void>;
  handleView(id: string): Promise<any>;
  handleIndexTableOrGraph(filters: WatcherFilters): Promise<any>;
}

export default Watcher;