import { AsyncLocalStorage } from "async_hooks";

/**
 * An instance of Node.js's AsyncLocalStorage, used to store and retrieve asynchronous context data.
 *
 * This storage is particularly useful when you want to keep track of contextual information across
 * asynchronous operations, ensuring that the state is maintained correctly between function calls.
 *
 * Note:
 * - The AsyncLocalStorage class is generic. It accepts a type parameter that represents the shape
 *   of the stored data. For better type safety, you might consider providing an explicit type when
 *   initializing it (e.g., new AsyncLocalStorage<YourContextType>()).
 */
export const requestLocalStorage = new AsyncLocalStorage<any>();
export const jobLocalStorage = new AsyncLocalStorage<any>();
export const scheduleLocalStorage = new AsyncLocalStorage<any>();