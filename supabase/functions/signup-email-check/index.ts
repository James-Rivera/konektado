// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';

type RequestBody = {
  email?: string | null;
};

type AuthUserSummary = {
  confirmed_at?: string | null;
  email?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

const AUTH_USERS_PER_PAGE = 1000;
const AUTH_USERS_MAX_PAGES = 10;

const supabaseUrl = Deno.env.get('PROJECT_URL');
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Signup email check function missing Supabase env vars.');
}

const supabase = createClient(supabaseUrl ?? '', serviceRoleKey ?? '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-origin': '*',
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isCompletedAuthAccount(user: AuthUserSummary) {
  const metadata = user.user_metadata ?? {};
  const stillNeedsSignupPassword = metadata.signup_password_required === true;

  return Boolean(
    !stillNeedsSignupPassword &&
      (user.email_confirmed_at || user.confirmed_at || user.last_sign_in_at),
  );
}

async function completedAuthUserExists(email: string) {
  for (let page = 1; page <= AUTH_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PER_PAGE,
    });

    if (error) {
      throw new Error(error.message);
    }

    const users = (data.users ?? []) as AuthUserSummary[];
    const matchingUser = users.find((user) => normalizeEmail(user.email) === email);

    if (matchingUser) {
      return isCompletedAuthAccount(matchingUser);
    }

    if (users.length < AUTH_USERS_PER_PAGE) {
      return false;
    }
  }

  return false;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { headers: corsHeaders, status: 405 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const email = normalizeEmail(body.email);

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Enter a valid email address.' }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
        status: 400,
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const existsInAuth = profile ? false : await completedAuthUserExists(email);

    return new Response(JSON.stringify({ exists: Boolean(profile) || existsInAuth }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not check this email.';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      status: 500,
    });
  }
});
