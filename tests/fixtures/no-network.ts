export const supabase = new Proxy({}, { get() { throw Error('Network access is disabled in the visual QA harness'); } });
