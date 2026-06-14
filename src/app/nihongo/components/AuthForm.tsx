"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MessageCircle, Mail, Lock, Loader2 } from "lucide-react";

interface AuthFormProps {
  onAuth: () => void;
}

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
        } else {
          setConfirmSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          onAuth();
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (confirmSent) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="inline-flex p-4 bg-emerald-100 rounded-full">
            <Mail size={32} className="text-emerald-500" />
          </div>
          <h2 className="font-extrabold text-xl text-gray-800">
            Check your email
          </h2>
          <p className="text-gray-500 text-sm">
            We sent a confirmation link to{" "}
            <strong className="text-gray-700">{email}</strong>. Click it to
            activate your account, then come back and sign in.
          </p>
          <button
            onClick={() => {
              setConfirmSent(false);
              setMode("signin");
            }}
            className="text-emerald-600 font-bold text-sm hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 pb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <MessageCircle
            size={40}
            className="text-white"
            fill="white"
            strokeWidth={0}
          />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            日本語練習
          </h1>
        </div>
        <p className="text-white/80 font-medium text-lg max-w-md mx-auto">
          Learn Japanese through conversations. Sign in to save your progress.
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center -mt-6 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-6 max-w-md w-full space-y-5">
          <div className="text-center">
            <h2 className="font-extrabold text-xl text-gray-800">
              {mode === "signin" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {mode === "signin"
                ? "Sign in to continue learning"
                : "Start your Japanese learning journey"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "signup" ? "Min 6 characters" : "Your password"
                  }
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-extrabold text-lg disabled:opacity-60 hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="text-center">
            {mode === "signin" ? (
              <p className="text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
