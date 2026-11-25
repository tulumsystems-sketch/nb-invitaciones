/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { User } from '@supabase/supabase-js';
import type { createSupabaseServerClient } from './lib/supabase';

type ServerSupabase = ReturnType<typeof createSupabaseServerClient>;

declare global {
  namespace App {
    interface Locals {
      supabase: ServerSupabase;
      user: User | null;
      isAnonymous: boolean;
      isAdmin: boolean;
    }
  }

  interface ImportMetaEnv {
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_ANON_KEY: string;
    readonly SUPABASE_SERVICE_ROLE_KEY: string;
    readonly PUBLIC_SITE_URL: string;
    readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
    readonly TURNSTILE_SECRET_KEY?: string;
    readonly GOOGLE_SERVICE_ACCOUNT_JSON?: string;
    readonly GOOGLE_SHEET_TEMPLATE_ID?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};