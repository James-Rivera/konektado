import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const serverStorage = {
  getItem: async () => null,
  removeItem: async () => undefined,
  setItem: async () => undefined,
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
  },
);
