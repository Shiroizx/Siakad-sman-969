import { isSiswaUser } from "@/lib/auth/siswa";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const ADMIN_LOGIN = "/login";
const SISWA_LOGIN = "/siswa/login";
const SISWA_ALUMNI_HOME = "/siswa/arsip-alumni";

function withCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, c);
  });
  return to;
}

function needsAuth(pathname: string) {
  if (pathname === ADMIN_LOGIN || pathname === SISWA_LOGIN) return false;
  if (pathname === "/") return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/siswa")) return true;
  return false;
}

function isSiswaArea(pathname: string) {
  return pathname.startsWith("/siswa") && pathname !== SISWA_LOGIN;
}

function isSiswaAlumniAllowedPath(pathname: string) {
  return (
    pathname === SISWA_ALUMNI_HOME || pathname.startsWith(`${SISWA_ALUMNI_HOME}/`)
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const { response, user, siswaIsAlumni } = await updateSession(request);
  const siswa = isSiswaUser(user);

  if (!user && needsAuth(pathname)) {
    const url = request.nextUrl.clone();
    if (isSiswaArea(pathname)) {
      url.pathname = SISWA_LOGIN;
    } else {
      url.pathname = ADMIN_LOGIN;
    }
    url.searchParams.set("next", pathname);
    return withCookies(response, NextResponse.redirect(url));
  }

  if (user) {
    if (pathname === ADMIN_LOGIN || pathname === SISWA_LOGIN) {
      const target = siswa
        ? siswaIsAlumni
          ? SISWA_ALUMNI_HOME
          : "/siswa/beranda"
        : "/";
      const url = request.nextUrl.clone();
      url.pathname = target;
      url.searchParams.delete("next");
      return withCookies(response, NextResponse.redirect(url));
    }

    if (siswa && siswaIsAlumni && isSiswaArea(pathname) && !isSiswaAlumniAllowedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = SISWA_ALUMNI_HOME;
      url.searchParams.delete("next");
      return withCookies(response, NextResponse.redirect(url));
    }

    if (siswa && !siswaIsAlumni && isSiswaAlumniAllowedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/siswa/arsip";
      url.searchParams.delete("next");
      return withCookies(response, NextResponse.redirect(url));
    }

    if (siswa && (pathname === "/" || pathname.startsWith("/admin"))) {
      const url = request.nextUrl.clone();
      url.pathname = siswaIsAlumni ? SISWA_ALUMNI_HOME : "/siswa/beranda";
      return withCookies(response, NextResponse.redirect(url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
