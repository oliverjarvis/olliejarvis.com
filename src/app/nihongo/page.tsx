"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Game from "./components/Game";
import { HighlightProvider } from "./highlight-context";
import SelectionToolbar from "./components/SelectionToolbar";
import AuthForm from "./components/AuthForm";
import { Loader2 } from "lucide-react";

export default function NihongoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <Loader2 size={32} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuth={() => {}} />;
  }

  return (
    <HighlightProvider>
      <Game />
      <SelectionToolbar />
    </HighlightProvider>
  );
}
