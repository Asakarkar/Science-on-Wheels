import { type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // QueryProvider encapsulates query and state caching for the frontend.
  return <>{children}</>;
}
