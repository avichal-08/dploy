"use client";

import { useState } from "react";
import { Loader2, Key } from "lucide-react";
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
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               email,
               password,
               invite_code: inviteCode,
            }),
            credentials: "include",
         });

         const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || "Registration failed");
         }

         window.location.href = "/home";
      } catch (err: any) {
         setError(err.message);
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="max-w-sm w-full mx-auto bg-[#111113] border border-[#27272A] rounded-md p-8 shadow-2xl">
         <h2 className="text-xl font-bold text-[#FAFAFA] mb-6 text-center">
            Create Account
         </h2>

         {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm mb-6">
               {error}
            </div>
         )}

         <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
               <label className="block text-xs font-medium text-[#A1A1AA]">
                  Email
               </label>
               <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-blue-500 transition-colors"
               />
            </div>

            <div className="space-y-2">
               <label className="block text-xs font-medium text-[#A1A1AA]">
                  Password
               </label>
               <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-blue-500 transition-colors"
               />
            </div>

            <div className="space-y-2">
               <label className="block text-xs font-medium text-[#A1A1AA]">
                  Invite Code
               </label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Key className="h-3.5 w-3.5 text-[#52525B]" />
                  </div>
                  <input
                     type="password"
                     value={inviteCode}
                     onChange={(e) => setInviteCode(e.target.value)}
                     placeholder="Required for early access"
                     required
                     className="w-full bg-[#09090B] border border-[#27272A] rounded-md pl-9 pr-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-blue-500 transition-colors"
                  />
               </div>
            </div>

            <button
               type="submit"
               disabled={isLoading}
               className="w-full flex justify-center items-center gap-2 bg-[#FAFAFA] text-[#09090B] py-2 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors mt-6 disabled:opacity-50"
            >
               {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
               {isLoading ? "Creating Account..." : "Sign Up"}
            </button>

            <p className="text-center text-xs text-[#A1A1AA] mt-6">
               Already have an account?{" "}
               <Link href="/auth/login" className="text-blue-400 hover:underline">
                  Log In
               </Link>
            </p>
         </form>
      </div>
   );
}
