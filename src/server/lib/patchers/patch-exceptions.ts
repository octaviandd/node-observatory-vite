/** @format */

import fs from "fs";
import path from "path";
import { watchers } from "../logger";
import { inspect } from "util";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if exceptions have been patched
const EXCEPTIONS_PATCHED_SYMBOL = Symbol.for('node-observer:exceptions-patched');

/**
 * Extract detailed error information, including formatted code context
 * @param error - The error object
 * @returns Error details object
 */
function extractErrorDetails(error: any) {
  if (!error) {
    return {
      message: "Unknown Error",
      stack: "No stack trace available",
      file: "Unknown file",
      title: "Error",
      codeContext: null,
    };
  }

  const stack = error.stack || "No stack trace available";
  const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

  const file = callerInfo.file;
  const line = Number(callerInfo.line);

  return {
    message: error.message || "No message provided",
    stack,
    file: callerInfo.file || "Unknown file",
    line: callerInfo.line || "Unknown line",
    title: error.name || "Error",
    codeContext:
      file && line ? formatCodeContext(file, line) : "No context available",
    fullError: inspect(error, { depth: null }), // Full error object for debugging
  };
}

/**
 * Format the code context for React-friendly rendering
 * @param filePath - The file path
 * @param line - The line number
 * @returns Code context as an array of objects
 */
function formatCodeContext(filePath: string, line: number) {
  try {
    const fileContent = fs.readFileSync(path.resolve(filePath), "utf-8");
    const fileLines = fileContent.split("\n");

    const contextLines = fileLines.slice(Math.max(0, line - 3), line + 2); // Fetch two lines before and after
    return contextLines.map((content, index) => {
      const currentLineNumber = line - 2 + index; // Adjust the line numbers
      return {
        lineNumber: currentLineNumber,
        content: content.trim(),
        isErrorLine: currentLineNumber === line,
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Monkey patch for uncaught exceptions to record errors
 */
function uncaughtPatcher() {
  process.on("uncaughtException", (error) => {
    const details = extractErrorDetails(error);
    if (watchers.errors) {
      watchers?.errors.addContent({
        type: "uncaughtException",
        ...details
      });
    }
  });
}

/**
 * Monkey patch for unhandled rejections to record errors
 */
function unhandledRejectionPatcher() {
  process.on("unhandledRejection", (reason) => {  
    const details = extractErrorDetails(reason);
    if (watchers?.errors) {
      watchers?.errors.addContent({
        type: "unhandledRejection",
        ...details
      });
    }
  });
}

if (process.env.NODE_OBSERVATORY_ERRORS) {
  // Check if exceptions have already been patched
  if (!(global as any)[EXCEPTIONS_PATCHED_SYMBOL]) {
    // Mark exceptions as patched
    (global as any)[EXCEPTIONS_PATCHED_SYMBOL] = true;

    // Apply all patchers
    uncaughtPatcher();
    unhandledRejectionPatcher();

  } else {
    console.log("[node-observer] Exceptions already patched, skipping");
  }
}