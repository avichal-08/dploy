"use client";

import { useState } from "react";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [githubId, setGithubId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, github_id: githubId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register account");
      }

      router.push("/home");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <h3 className="text-lg font-medium text-[#FAFAFA] mb-1">Create an account</h3>
        <p className="text-sm text-[#A1A1AA]">Start deploying your projects instantly.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#FAFAFA]">
            Email address
          </label>
          <div className="mt-2">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full bg-[#09090B] border border-[#27272A] rounded-md px-4 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="githubId" className="block text-sm font-medium text-[#FAFAFA]">
            GitHub Username
          </label>
          <div className="mt-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            </div>
            <input
              id="githubId"
              type="text"
              required
              value={githubId}
              onChange={(e) => setGithubId(e.target.value)}
              className="block w-full pl-10 bg-[#09090B] border border-[#27272A] rounded-md px-4 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="octocat"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading || !email || !githubId}
          className="w-full flex items-center justify-center gap-2 bg-[#FAFAFA] text-[#09090B] py-2.5 px-4 rounded-md font-medium text-sm hover:bg-[#E4E4E7] transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="text-center text-sm">
        <span className="text-[#A1A1AA]">Already have an account? </span>
        <Link href="/auth/login" className="font-medium text-blue-400 hover:text-blue-300">
          Sign in
        </Link>
      </div>
    </form>
  );
}
