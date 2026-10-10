import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const serverStorage = {
  getItem: async () => null,
  removeItem: async () => undefined,
  setItem: async () => undefined,
};

// `fetch` has no timeout of its own, so on a weak mobile signal a request can
// hang until the OS gives up and the screen sits on its skeleton. These limits
// cover waiting for the response to start, not reading a long body (DEC-138).
const REQUEST_TIMEOUT_MS = 20_000;
// Edge functions (contact OTP, verification email) call third-party providers.
const FUNCTION_TIMEOUT_MS = 45_000;
// Photo and document uploads can legitimately take a while on slow data.
const STORAGE_WRITE_TIMEOUT_MS = 120_000;

function getRequestTimeoutMs(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (url.includes("/storage/v1/") && method !== "GET" && method !== "HEAD") {
    return STORAGE_WRITE_TIMEOUT_MS;
  }
  if (url.includes("/functions/v1/")) return FUNCTION_TIMEOUT_MS;
  return REQUEST_TIMEOUT_MS;
}

function createTimeoutError() {
  const error = new Error("The connection is too slow right now. Check your signal and try again.");
  error.name = "TimeoutError";
  return error;
}

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const callerSignal = init?.signal;
  const abortFromCaller = () => controller.abort();
  let timedOut = false;

  if (callerSignal?.aborted) controller.abort();
  callerSignal?.addEventListener("abort", abortFromCaller);

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, getRequestTimeoutMs(input, init));

  return fetch(input, { ...init, signal: controller.signal })
    .catch((error: unknown) => {
      throw timedOut ? createTimeoutError() : error;
    })
    .finally(() => {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    });
};

// Supabase client configured for React Native + Expo
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: typeof window === "undefined" ? serverStorage : AsyncStorage,
      autoRefreshToken: typeof window !== "undefined",
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  },
);

// Supabase's React Native guidance: refresh the session only while the app is
// in the foreground. A backgrounded app cannot keep its refresh timer running
// reliably, so this restarts it on resume instead of waiting for a request to
// find an expired token.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
