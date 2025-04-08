import type { RequestOptions } from 'node:http';
import * as url from 'url';
import { HttpRequestData } from "../../../../../types";;
import { fileURLToPath } from 'url';

/**
 * Check for installed packages
 *
 * @format
 * @param npmPackage
 * @returns @boolean
 */

export const isPackageInstalled = (npmPackage: string) => {
  try {
    require.resolve(npmPackage);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Parse headers from a string
 * @param headersString
 * @returns @Object
 */
export const parseHeaders = <T extends Record<string, string>>(
  headersString: string
): { method: string; path: string; version: string; headers: T } => {
  const [startLine, ...headerLines] = headersString.split("\r\n");

  // Parse the start line (HTTP method, path, version)
  const [method, path, version] = startLine.split(" ");

  // Parse the headers
  const headers = {} as T;
  headerLines.forEach((line) => {
    const [key, value] = line.split(": ");
    if (key && value) {
      headers[key as keyof T] = value as unknown as T[keyof T];
    }
  });

  return {
    method,
    path,
    version,
    headers,
  };
};

/**
 * Extracts file name and line number from the stack trace.
 * @param stackLines - Array of stack trace lines.
 * @returns Object containing file and line information.
 */
export function getCallerInfo(filename: string) {
  if (!process.env.NODE_OBSERVATORY_ERROR_TRACING) {
    return { file: "unknown", line: "unknown" };
  }

  const originalErrorStackLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 100;
  const stack = new Error().stack;
  const stackLines = stack?.split("\n") || [];

  // const filteredStackLines = stackLines.filter(line => {
  //   return !line.includes("node_modules") && // Exclude dependencies
  //     !line.includes(filename) &&  // Exclude this patch file dynamically
  //     !line.includes(__filename) &&
  //     !line.includes("Namespace") &&
  //     !line.includes("node:async_hooks")
  // })


  for (const line of stackLines) {
    // Skip lines from node_modules or the patcher itself
    if (
      !line.includes("node_modules") && // Exclude dependencies
      !line.includes(filename) &&  // Exclude this patch file dynamically
      !line.includes(fileURLToPath(import.meta.url)) &&
      !line.includes("Namespace") &&
      !line.includes("node:async_hooks")
    ) {
      const match =
        line.match(/\((.*):(\d+):(\d+)\)/) || line.match(/at (.*):(\d+):(\d+)/);
      if (match) {
        return {
          file: match[1],
          line: match[2],
        };
      }
    }
  }
  Error.stackTraceLimit = originalErrorStackLimit;
  return { file: "unknown", line: "unknown" };
}

/**
 * Makes sure options is an url object
 * return an object with default value and parsed options
 * @param options original options for the request
 * @param [extraOptions] additional options for the request
 */
export const getRequestInfo = (
  options: url.URL | RequestOptions | string,
  extraOptions?: RequestOptions,
): {
  origin: string;
  pathname: string;
  method: string;
  invalidUrl: boolean;
  optionsParsed: RequestOptions;
} => {
  let pathname: string;
  let origin: string;
  let optionsParsed: RequestOptions;
  let invalidUrl = false;
  if (typeof options === 'string') {
    try {
      const convertedOptions = stringUrlToHttpOptions(options);
      optionsParsed = convertedOptions;
      pathname = convertedOptions.pathname || '/';
    } catch (e) {
      invalidUrl = true;
      // for backward compatibility with how url.parse() behaved.
      optionsParsed = {
        path: options,
      };
      pathname = optionsParsed.path || '/';
    }

    origin = `${optionsParsed.protocol || 'http:'}//${optionsParsed.host}`;
    if (extraOptions !== undefined) {
      Object.assign(optionsParsed, extraOptions);
    }
  } else if (options instanceof url.URL) {
    optionsParsed = {
      protocol: options.protocol,
      hostname:
        typeof options.hostname === 'string' && options.hostname.startsWith('[')
          ? options.hostname.slice(1, -1)
          : options.hostname,
      path: `${options.pathname || ''}${options.search || ''}`,
    };
    if (options.port !== '') {
      optionsParsed.port = Number(options.port);
    }
    if (options.username || options.password) {
      optionsParsed.auth = `${options.username}:${options.password}`;
    }
    pathname = options.pathname;
    origin = options.origin;
    if (extraOptions !== undefined) {
      Object.assign(optionsParsed, extraOptions);
    }
  } else {
    optionsParsed = Object.assign({ protocol: options.host ? 'http:' : undefined }, options);

    const hostname =
      optionsParsed.host ||
      (optionsParsed.port != null ? `${optionsParsed.hostname}${optionsParsed.port}` : optionsParsed.hostname);
    origin = `${optionsParsed.protocol || 'http:'}//${hostname}`;

    pathname = (options as url.URL).pathname;
    if (!pathname && optionsParsed.path) {
      try {
        const parsedUrl = new URL(optionsParsed.path, origin);
        pathname = parsedUrl.pathname || '/';
      } catch (e) {
        pathname = '/';
      }
    }
  }

  // some packages return method in lowercase..
  // ensure upperCase for consistency
  const method = optionsParsed.method ? optionsParsed.method.toUpperCase() : 'GET';

  return { origin, pathname, method, optionsParsed, invalidUrl };
};

export function httpRequestToRequestData(request: {
  method?: string;
  url?: string;
  headers?: {
    [key: string]: string | string[] | undefined;
  };
  protocol?: string;
  socket?: {
    encrypted?: boolean;
    remoteAddress?: string;
  };
}): any {
  const headers = request.headers || {};
  const host = typeof headers.host === 'string' ? headers.host : undefined;
  const protocol = request.protocol || (request.socket?.encrypted ? 'https' : 'http');
  const url = request.url || '';

  const absoluteUrl = getAbsoluteUrl({
    url,
    host,
    protocol,
  });

  // This is non-standard, but may be sometimes set
  // It may be overwritten later by our own body handling
  const data = (request as any).body || undefined;

  // This is non-standard, but may be set on e.g. Next.js or Express requests
  const cookies = (request as any).cookies;

  return dropUndefinedKeys({
    url: absoluteUrl,
    method: request.method || 'GET',
    query_string: extractQueryParamsFromUrl(url),
    headers: Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value
      ])
    ),
    cookies,
    data,
  });
}

export function dropUndefinedKeys<T>(inputValue: T): T {
  // This map keeps track of what already visited nodes map to.
  // Our Set - based memoBuilder doesn't work here because we want to the output object to have the same circular
  // references as the input object.
  const memoizationMap = new Map<unknown, unknown>();

  // This function just proxies `_dropUndefinedKeys` to keep the `memoBuilder` out of this function's API
  return _dropUndefinedKeys(inputValue, memoizationMap);
}

function isPojo(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== 'object') {
    return false;
  }

  try {
    const name = (Object.getPrototypeOf(input) as { constructor: { name: string } }).constructor.name;
    return !name || name === 'Object';
  } catch {
    return true;
  }
}

function _dropUndefinedKeys<T>(inputValue: T, memoizationMap: Map<unknown, unknown>): T {
  if (isPojo(inputValue)) {
    // If this node has already been visited due to a circular reference, return the object it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal as T;
    }

    const returnValue: { [key: string]: unknown } = {};
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    for (const key of Object.getOwnPropertyNames(inputValue)) {
      if (typeof inputValue[key] !== 'undefined') {
        returnValue[key] = _dropUndefinedKeys(inputValue[key], memoizationMap);
      }
    }

    return returnValue as T;
  }

  if (Array.isArray(inputValue)) {
    // If this node has already been visited due to a circular reference, return the array it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal as T;
    }

    const returnValue: unknown[] = [];
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    inputValue.forEach((item: unknown) => {
      returnValue.push(_dropUndefinedKeys(item, memoizationMap));
    });

    return returnValue as unknown as T;
  }

  return inputValue;
}

function getAbsoluteUrl({
  url,
  protocol,
  host,
}: {
  url?: string;
  protocol: string;
  host?: string;
}): string | undefined {
  if (url?.startsWith('http')) {
    return url;
  }

  if (url && host) {
    return `${protocol}://${host}${url}`;
  }

  return undefined;
}

/** Extract the query params from an URL. */
export function extractQueryParamsFromUrl(url: string): string | undefined {
  // url is path and query string
  if (!url) {
    return;
  }

  try {
    // The `URL` constructor can't handle internal URLs of the form `/some/path/here`, so stick a dummy protocol and
    // hostname as the base. Since the point here is just to grab the query string, it doesn't matter what we use.
    const queryParams = new URL(url, 'http://s.io').search.slice(1);
    return queryParams.length ? queryParams : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Mimics Node.js conversion of URL strings to RequestOptions expected by
 * `http.request` and `https.request` APIs.
 *
 * See https://github.com/nodejs/node/blob/2505e217bba05fc581b572c685c5cf280a16c5a3/lib/internal/url.js#L1415-L1437
 *
 * @param stringUrl
 * @throws TypeError if the URL is not valid.
 */
function stringUrlToHttpOptions(stringUrl: string): RequestOptions & { pathname: string } {
  // This is heavily inspired by Node.js handling of the same situation, trying
  // to follow it as closely as possible while keeping in mind that we only
  // deal with string URLs, not URL objects.
  const { hostname, pathname, port, username, password, search, protocol, hash, href, origin, host } = new URL(
    stringUrl,
  );

  const options: RequestOptions & {
    pathname: string;
    hash: string;
    search: string;
    href: string;
    origin: string;
  } = {
    protocol: protocol,
    hostname: hostname && hostname[0] === '[' ? hostname.slice(1, -1) : hostname,
    hash: hash,
    search: search,
    pathname: pathname,
    path: `${pathname || ''}${search || ''}`,
    href: href,
    origin: origin,
    host: host,
  };
  if (port !== '') {
    options.port = Number(port);
  }
  if (username || password) {
    options.auth = `${decodeURIComponent(username)}:${decodeURIComponent(password)}`;
  }
  return options;
}


/**
 * Standardizes HTTP request data from various libraries to conform to the HttpRequestData interface
 * This ensures consistent data structure regardless of which HTTP client library was used
 * 
 * @param data The raw HTTP request data from any supported library
 * @returns A standardized HttpRequestData object
 */
export function standardizeHttpRequestData(data: any): HttpRequestData {
  // Ensure all required fields are present
  const standardized: HttpRequestData = {
    // Required fields with fallbacks
    method: (data.method || 'GET').toUpperCase(),
    origin: data.origin || '',
    pathname: data.pathname || data.path || '/',
    protocol: data.protocol || 'http:',
    statusCode: data.statusCode || 0,
    statusMessage: data.statusMessage || '',
    duration: data.duration || 0,
    aborted: data.aborted || false,
    headers: data.headers || {},
    responseBody: data.responseBody || '',
    responseBodySize: data.responseBodySize || 0,
    isMedia: data.isMedia || false,
    library: data.library || 'unknown',
    file: data.file || '',
    line: data.line || '',
    ...data
  };

  // Normalize hostname/host
  if (!standardized.hostname && standardized.host) {
    standardized.hostname = standardized.host;
  } else if (!standardized.host && standardized.hostname) {
    standardized.host = standardized.hostname;
  }

  // Normalize path/pathname
  if (!standardized.path && standardized.pathname) {
    standardized.path = standardized.pathname;
  }

  // Ensure responseBody is properly handled
  if (standardized.responseBody && typeof standardized.responseBody !== 'string' && !(standardized.responseBody instanceof Buffer)) {
    try {
      // Try to stringify if it's an object
      standardized.responseBody = JSON.stringify(standardized.responseBody);
    } catch (error) {
      // If stringification fails, convert to string
      standardized.responseBody = String(standardized.responseBody);
    }
  }

  // Calculate responseBodySize if not provided
  if (!standardized.responseBodySize && standardized.responseBody) {
    if (typeof standardized.responseBody === 'string') {
      standardized.responseBodySize = Buffer.byteLength(standardized.responseBody);
    } else if (standardized.responseBody instanceof Buffer) {
      standardized.responseBodySize = standardized.responseBody.length;
    }
  }

  standardized.fullUrl = `${standardized.origin}${standardized.pathname}`;

  // Remove undefined values
  return dropUndefinedKeys(standardized);
}

/**
 * Extracts the most important information from HTTP request data for display
 * This is useful for creating summaries or table views of HTTP requests
 * 
 * @param data The standardized HTTP request data
 * @returns An object with the most relevant fields for display
 */
export function extractHttpDisplayData(data: HttpRequestData): {
  id?: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  size: number;
  library: string;
  timestamp?: string;
} {
  // Create the full URL from components
  const url = `${data.origin}${data.pathname}`;
  
  return {
    id: data.uuid,
    method: data.method,
    url: url,
    statusCode: data.statusCode,
    duration: data.duration,
    size: data.responseBodySize,
    library: data.library,
    timestamp: data.created_at ? new Date(data.created_at).toISOString() : undefined
  };
}