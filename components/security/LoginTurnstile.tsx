"use client";

import type {
  TurnstileInstance,
  TurnstileProps,
} from "@marsidev/react-turnstile";
import dynamic from "next/dynamic";
import { forwardRef, useEffect, useState } from "react";

const Turnstile = dynamic(
  () =>
    import("@marsidev/react-turnstile").then((mod) => mod.Turnstile),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[65px] w-[300px] max-w-full items-center justify-center rounded-lg border border-white/10 bg-slate-950/40 text-xs text-indigo-200/70"
        aria-hidden
      >
        Memuat verifikasi…
      </div>
    ),
  }
);

export type LoginTurnstileProps = Omit<TurnstileProps, "siteKey"> & {
  siteKey: string;
};

/**
 * Turnstile hanya di-mount di browser (bukan SSR) agar tidak bentrok dengan
 * React Strict Mode / hydration di Next.js.
 */
export const LoginTurnstile = forwardRef<
  TurnstileInstance | null,
  LoginTurnstileProps
>(function LoginTurnstile({ siteKey, options, ...rest }, ref) {
  const [client, setClient] = useState(false);

  useEffect(() => {
    setClient(true);
  }, []);

  if (!client) {
    return (
      <div
        className="flex h-[65px] w-[300px] max-w-full items-center justify-center rounded-lg border border-white/10 bg-slate-950/40 text-xs text-indigo-200/70"
        aria-hidden
      >
        Memuat verifikasi…
      </div>
    );
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      options={{
        size: "normal",
        theme: "dark",
        ...options,
      }}
      {...rest}
    />
  );
});
