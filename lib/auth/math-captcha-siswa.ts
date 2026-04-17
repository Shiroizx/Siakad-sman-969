import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SEC = 15 * 60;

type ChallengePayload = {
  n1: number;
  n2: number;
  exp: number;
  sig: string;
};

function getHmacSecret(): string | null {
  return (
    process.env.MATH_CAPTCHA_HMAC_SECRET ??
    process.env.TURNSTILE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    null
  );
}

function signPayload(n1: number, n2: number, exp: number, secret: string): string {
  const payload = `${n1}|${n2}|${exp}`;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Menghasilkan soal penjumlahan dan token yang ditandatangani untuk verifikasi server.
 */
export function createSiswaMathChallenge():
  | { n1: number; n2: number; token: string }
  | { error: string } {
  const secret = getHmacSecret();
  if (!secret) {
    return {
      error:
        "CAPTCHA belum bisa dibuat. Setel MATH_CAPTCHA_HMAC_SECRET, atau pastikan TURNSTILE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY tersedia di server.",
    };
  }

  const n1 = 1 + Math.floor(Math.random() * 12);
  const n2 = 1 + Math.floor(Math.random() * 12);
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const sig = signPayload(n1, n2, exp, secret);

  const body: ChallengePayload = { n1, n2, exp, sig };
  const token = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");

  return { n1, n2, token };
}

/**
 * Memverifikasi jawaban penjumlahan terhadap token yang dikeluarkan createSiswaMathChallenge.
 */
export function verifySiswaMathChallenge(
  token: string,
  answerRaw: string
): { ok: true } | { ok: false; message: string } {
  const secret = getHmacSecret();
  if (!secret) {
    return { ok: false, message: "Konfigurasi server CAPTCHA tidak lengkap." };
  }

  if (!token.trim()) {
    return { ok: false, message: "Selesaikan verifikasi penjumlahan terlebih dahulu." };
  }

  let parsed: ChallengePayload;
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    parsed = JSON.parse(json) as ChallengePayload;
  } catch {
    return { ok: false, message: "Validasi keamanan (CAPTCHA) tidak valid. Muat ulang halaman." };
  }

  const { n1, n2, exp, sig } = parsed;
  if (
    typeof n1 !== "number" ||
    typeof n2 !== "number" ||
    typeof exp !== "number" ||
    typeof sig !== "string"
  ) {
    return { ok: false, message: "Validasi keamanan (CAPTCHA) tidak valid. Muat ulang halaman." };
  }

  if (!Number.isInteger(n1) || !Number.isInteger(n2) || n1 < 1 || n2 < 1) {
    return { ok: false, message: "Validasi keamanan (CAPTCHA) tidak valid. Muat ulang halaman." };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > exp) {
    return { ok: false, message: "CAPTCHA sudah kedaluwarsa. Muat ulang halaman dan coba lagi." };
  }

  const expectedSig = signPayload(n1, n2, exp, secret);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, message: "Validasi keamanan (CAPTCHA) tidak valid. Muat ulang halaman." };
  }

  const ans = parseInt(String(answerRaw).trim(), 10);
  if (Number.isNaN(ans) || ans !== n1 + n2) {
    return { ok: false, message: "Jawaban penjumlahan salah." };
  }

  return { ok: true };
}
