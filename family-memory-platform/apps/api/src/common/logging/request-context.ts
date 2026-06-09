import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
  requestId: string;
  userId?: string;
  method?: string;
  path?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
