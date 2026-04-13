import { isSiswaUser } from "@/lib/auth/siswa";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export type SessionUpdateResult = {
  response: NextResponse;
  user: User | null;
  /** Hanya bermakna bila `user` adalah akun portal siswa (`is_alumni` dari `students`). */
  siswaIsAlumni: boolean;
};

export async function updateSession(
  request: NextRequest
): Promise<SessionUpdateResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let siswaIsAlumni = false;
  if (user && isSiswaUser(user)) {
    const sid = String(user.user_metadata?.student_id ?? "").trim();
    let st = supabase.from("students").select("is_alumni").limit(1);
    st = sid ? st.eq("id", sid) : st.eq("user_id", user.id);
    const { data: stRow } = await st.maybeSingle();
    siswaIsAlumni = Boolean(stRow?.is_alumni);
  }

  return { response: supabaseResponse, user, siswaIsAlumni };
}
