import { createContext, useContext, type ReactNode } from "react";

type TopicContextValue = { slug: string };

const TopicContext = createContext<TopicContextValue | null>(null);

export function TopicProvider({ slug, children }: { slug: string; children: ReactNode }) {
  return <TopicContext.Provider value={{ slug }}>{children}</TopicContext.Provider>;
}

export function useTopic(): TopicContextValue {
  const ctx = useContext(TopicContext);
  if (!ctx) throw new Error("useTopic must be used inside a TopicProvider");
  return ctx;
}
