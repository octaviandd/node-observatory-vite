/** @format */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const timeAgo = (time: string) => {
  const currentTime = new Date();
  const timeDifference = currentTime.getTime() - new Date(time).getTime();
  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days == 1 ? "" : "s"} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours == 1 ? "" : "s"} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes == 1 ? "" : "s"} ago`;
  } else {
    return `${seconds} second${seconds == 1 ? "s" : ""} ago`;
  }
};

export const getSize = (size: number) => {
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} kB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const formatDate = (date: string) => {
  return new Date(date)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
        second: "2-digit",
      })
      .replace(",", "")
      .toUpperCase();
  };


export const timePeriod = (period: "1h" | "24h" | "7d" | "14d" | "30d") => {
  return new Date(
    Date.now() -
    (period === "1h"
      ? 1 * 60 * 60 * 1000
      : period === "24h"
        ? 24 * 60 * 60 * 1000
        : period === "14d"
          ? 14 * 24 * 60 * 60 * 1000
          : period === '30d'
            ? 30 * 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000)
  )
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "")
    .toUpperCase()
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDuration = (value: number) => value > 999 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
export const formatCount = (count: number) => count > 999 ? `${(count / 1000).toFixed(1)}K` : count;