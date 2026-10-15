"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [error, setError] = useState("");
   const [isLoading, setIsLoading] = useState(false);

   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
         const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
         });

         const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || "Invalid credentials");
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
         <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-fg">Welcome back</h2>
         <p className="mt-1.5 text-sm text-mute">Log in to manage your deployments.</p>

         {error && (
            <div role="alert" className="mt-6 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
               {error}
            </div>
         )}

         <form onSubmit={handleLogin} className="mt-8 space-y-4">
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="ui-input"
               />
            </div>

            <button type="submit" disabled={isLoading} className="ui-btn-accent group mt-2 w-full py-2.5">
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
               {isLoading ? "Logging in..." : "Log in"}
               {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
         </form>

         <p className="mt-8 text-sm text-mute">
            Have an invite code?{" "}
            <Link href="/auth/register" className="font-medium text-fg underline decoration-hair-strong underline-offset-4 transition hover:decoration-signal">
               Create an account
            </Link>
         </p>
      </div>
   );
}
