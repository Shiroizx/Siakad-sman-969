import { isGuruBkUser } from "@/lib/auth/guru-bk";
import { isSiswaUser } from "@/lib/auth/siswa";
import { isWaliKelasUser } from "@/lib/auth/wali-kelas";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const ADMIN_LOGIN = "/login";
const SISWA_LOGIN = "/siswa/login";
const SISWA_ALUMNI_HOME = "/siswa/arsip-alumni";
const WALI_KELAS_HOME = "/wali-kelas/ews";
const GURU_BK_HOME = "/guru-bk/ews";

function withCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, c);
  });
  return to;
}

function needsAuth(pathname: string) {
  if (pathname === ADMIN_LOGIN || pathname === SISWA_LOGIN) return false;
  if (pathname === "/") return false;
  if (pathname === "/beranda") return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/siswa")) return true;
  if (pathname.startsWith("/wali-kelas")) return true;
  if (pathname.startsWith("/guru-bk")) return true;
  return false;
}

function isSiswaArea(pathname: string) {
  return pathname.startsWith("/siswa") && pathname !== SISWA_LOGIN;
}

function isWaliKelasArea(pathname: string) {
  return pathname.startsWith("/wali-kelas");
}

function isGuruBkArea(pathname: string) {
  return pathname.startsWith("/guru-bk");
}

function isAdminArea(pathname: string) {
  return pathname === "/beranda" || pathname.startsWith("/admin");
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
  const waliKelas = isWaliKelasUser(user);
  const guruBk = isGuruBkUser(user);

  // Redirect ke login jika belum auth
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
    // --- Redirect setelah login ---
    if (pathname === ADMIN_LOGIN || pathname === SISWA_LOGIN) {
      let target: string;
      if (siswa) {
        target = siswaIsAlumni ? SISWA_ALUMNI_HOME : "/siswa/beranda";
      } else if (waliKelas) {
        target = WALI_KELAS_HOME;
      } else if (guruBk) {
        target = GURU_BK_HOME;
      } else {
        target = "/beranda";
      }
      const url = request.nextUrl.clone();
      url.pathname = target;
      url.searchParams.delete("next");
      return withCookies(response, NextResponse.redirect(url));
    }

    // --- Proteksi area: Alumni siswa hanya bisa akses arsip ---
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

    // --- Siswa tidak boleh masuk area admin, wali kelas, atau guru bk ---
    if (siswa && (isAdminArea(pathname) || isWaliKelasArea(pathname) || isGuruBkArea(pathname))) {
      const url = request.nextUrl.clone();
      url.pathname = siswaIsAlumni ? SISWA_ALUMNI_HOME : "/siswa/beranda";
      return withCookies(response, NextResponse.redirect(url));
    }

    // --- Wali Kelas tidak boleh masuk area admin atau guru bk ---
    if (waliKelas && (isAdminArea(pathname) || isGuruBkArea(pathname))) {
      const url = request.nextUrl.clone();
      url.pathname = WALI_KELAS_HOME;
      return withCookies(response, NextResponse.redirect(url));
    }

    // --- Wali Kelas tidak boleh masuk area siswa ---
    if (waliKelas && isSiswaArea(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = WALI_KELAS_HOME;
      return withCookies(response, NextResponse.redirect(url));
    }

    // --- Guru BK tidak boleh masuk area admin, wali kelas, atau siswa ---
    if (guruBk && (isAdminArea(pathname) || isWaliKelasArea(pathname) || isSiswaArea(pathname))) {
      const url = request.nextUrl.clone();
      url.pathname = GURU_BK_HOME;
      return withCookies(response, NextResponse.redirect(url));
    }

    // --- Admin/staff biasa tidak boleh masuk area Wali Kelas atau Guru BK ---
    if (!siswa && !waliKelas && !guruBk && (isWaliKelasArea(pathname) || isGuruBkArea(pathname))) {
      const url = request.nextUrl.clone();
      url.pathname = "/beranda";
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
