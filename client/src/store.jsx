import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api.js";

// ---- Live-update bus over Server-Sent Events ----
// Every mutation on the server broadcasts { resource } over /api/events.
// Components subscribe to a resource name and refetch when it changes,
// which is how multiple phones stay in sync without a manual refresh.

const SSEContext = createContext(null);

export function SSEProvider({ children }) {
  const listenersRef = useRef(new Map());

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (evt) => {
      try {
        const { resource } = JSON.parse(evt.data);
        const fns = listenersRef.current.get(resource);
        if (fns) fns.forEach((fn) => fn());
      } catch {
        // ignore malformed / keep-alive frames
      }
    };

    // Backstop poll: some edge proxies (used when the frontend and API are
    // deployed on different hosts) don't relay long-lived SSE streams
    // cleanly, so this guarantees eventual sync even if the stream above
    // never delivers a single event.
    const pollId = setInterval(() => {
      for (const fns of listenersRef.current.values()) {
        fns.forEach((fn) => fn());
      }
    }, 20000);

    return () => {
      es.close();
      clearInterval(pollId);
    };
  }, []);

  const subscribe = useCallback((resource, fn) => {
    const map = listenersRef.current;
    if (!map.has(resource)) map.set(resource, new Set());
    map.get(resource).add(fn);
    return () => map.get(resource)?.delete(fn);
  }, []);

  return <SSEContext.Provider value={{ subscribe }}>{children}</SSEContext.Provider>;
}

export function useLiveResource(resource, onChange) {
  const ctx = useContext(SSEContext);
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(resource, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, onChange]);
}

// ---- Shared format-types list (used across nearly every page) ----

const FormatTypesContext = createContext(null);

export function FormatTypesProvider({ children }) {
  const [formatTypes, setFormatTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const rows = await api.listFormatTypes();
    setFormatTypes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useLiveResource("format-types", refetch);

  return (
    <FormatTypesContext.Provider value={{ formatTypes, loading, refetch }}>
      {children}
    </FormatTypesContext.Provider>
  );
}

export function useFormatTypes() {
  return useContext(FormatTypesContext);
}
