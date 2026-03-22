"use client";

import { useState } from "react";
import { useAdminStore } from "./store";
import { Copy, Plus, Save, Terminal, ShieldAlert } from "lucide-react";
import TenantsList from "./tenants/page";

export default function AdminPortal() {
  const { apiKey, setApiKey, logout } = useAdminStore();
  const [inputKey, setInputKey] = useState("");

  if (!apiKey) {
    return (
      <div className="flex bg-zinc-950 items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 backdrop-blur-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500 via-orange-500 to-red-500"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
              <ShieldAlert className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Super Admin</h1>
            <p className="text-sm text-zinc-400 mt-2 text-center">
              Restricted area. Enter your master API key to continue.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputKey.trim()) setApiKey(inputKey.trim());
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">
                Master Key
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono text-sm"
                placeholder="cx_super_admin..."
              />
            </div>

            <button
              type="submit"
              disabled={!inputKey.trim()}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Access Control Plane
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 selection:bg-red-500/30">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 space-x-4">
             <div className="h-8 w-8 bg-red-500 rounded flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-400">
               <ShieldAlert className="h-5 w-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-white font-medium tracking-wide">CourierX Admin</h1>
              <p className="text-xs text-red-400 font-mono">god_mode=true</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Lock Session
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TenantsList apiKey={apiKey} />
      </main>
    </div>
  );
}
