"use client";

import { useState } from "react";
import { ArrowRight, Key, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [inviteCode, setInviteCode] = useState("");
   const [error, setError] = useState("");
   const [isLoading, setIsLoading] = useState(false);

   const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
         const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, invite_code: inviteCode }),
            credentials: "include",
         });

         const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || "Registration failed");
         }

         window.location.href = "/home";
      } catch (err) {
         setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="w-full max-w-sm">
         <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-fg">Create your account</h2>
         <p className="mt-1.5 text-sm text-mute">The hosted beta is invite-only.</p>

         {error && (
            <div role="alert" className="mt-6 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
               {error}
            </div>
         )}

         <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div className="space-y-1.5">
               <label htmlFor="email" className="ui-label">Email</label>
               <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="ui-input"
                  placeholder="you@company.com"
               />
            </div>

            <div className="space-y-1.5">
               <label htmlFor="password" className="ui-label">Password</label>
               <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="ui-input"
                  placeholder="At least 6 characters"
               />
            </div>

            <div className="space-y-1.5">
               <label htmlFor="invite" className="ui-label">Invite code</label>
               <div className="relative">
                  <Key className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                  <input
                     id="invite"
                     type="password"
                     value={inviteCode}
                     onChange={(e) => setInviteCode(e.target.value)}
                     placeholder="Required for early access"
                     required
                     className="ui-input pl-9"
                  />
               </div>
            </div>

            <button type="submit" disabled={isLoading} className="ui-btn-accent group mt-2 w-full py-2.5">
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
               {isLoading ? "Creating account..." : "Create account"}
               {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
         </form>

         <p className="mt-8 text-sm text-mute">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-fg underline decoration-hair-strong underline-offset-4 transition hover:decoration-signal">
               Log in
            </Link>
         </p>
      </div>
   );
}
