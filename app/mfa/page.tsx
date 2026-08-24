"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * MFA challenge/enrollment screen. Wired to Supabase Auth's MFA API
 * (TOTP factors); becomes fully functional once a Supabase project with
 * MFA enabled is provisioned. See ARCHITECTURE.md section F.
 */
export default function MfaPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError || !factors?.totp?.[0]) {
      setError(factorsError?.message ?? "No MFA factor enrolled for this account.");
      setLoading(false);
      return;
    }

    const factor = factors.totp[0];
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });

    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Could not start MFA challenge.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.push("/select-organization");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Two-factor verification</h1>
          <p className="mt-1 text-sm text-navy-100">Enter the 6-digit code from your authenticator app.</p>
        </div>

        <form onSubmit={handleVerify} className="pv-card space-y-4 p-6">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            className="pv-input text-center font-mono text-lg tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
          />

          {error && <p className="text-sm text-safe-red">{error}</p>}

          <button type="submit" disabled={loading} className="pv-btn-primary w-full">
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
