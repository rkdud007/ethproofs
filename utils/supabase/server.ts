import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { SupabaseClientOptions } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

export const createClient = (
  clientOptions?: SupabaseClientOptions<"public">
) => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      ...clientOptions,
    }
  )
}
