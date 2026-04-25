"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminStore } from "../../store";
import { ArrowLeft, Key, Mail, Globe, Server, Activity, ShieldAlert } from "lucide-react";

interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  email: string;
  mode: string;
  status: string;
  plan: string;
  plan_email_limit: number;
  created_at: string;
  stats: {
    emails_sent_7d: number;
    api_keys_count: number;
    providers_count: number;
    domains_count: number;
  };
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { apiKey } = useAdminStore();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiKey) {
      router.push("/admin");
      return;
    }

    const fetchDetail = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
        const res = await fetch(`${baseUrl}/admin/tenants/${params.id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setTenant(data);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch tenant details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [apiKey, params.id, router]);

  if (loading) {
    return <div className="text-zinc-500 font-mono animate-pulse p-8">Loading tenant payload...</div>;
  }

  if (!tenant) return <div className="text-red-500 p-8">Tenant tracking lost.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Global View
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight flex items-center gap-3">
            {tenant.name}
            <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase border ${tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {tenant.status}
            </span>
          </h1>
          <p className="text-zinc-400 mt-2 font-mono text-sm">{tenant.id} • {tenant.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-300 capitalize">{tenant.plan || 'Free'} Tier</p>
          <p className="text-xs text-zinc-500 font-mono mt-1">Limit: {tenant.plan_email_limit?.toLocaleString() || 100} / mo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Support Stats Cards */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-zinc-400 font-medium text-sm">Volume (7d)</h3>
          </div>
          <p className="text-3xl font-semibold text-white">{tenant.stats.emails_sent_7d.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Key className="h-5 w-5" />
            </div>
            <h3 className="text-zinc-400 font-medium text-sm">API Keys</h3>
          </div>
          <p className="text-3xl font-semibold text-white">{tenant.stats.api_keys_count}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Server className="h-5 w-5" />
            </div>
            <h3 className="text-zinc-400 font-medium text-sm">Providers</h3>
          </div>
          <p className="text-3xl font-semibold text-white">{tenant.stats.providers_count}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="text-zinc-400 font-medium text-sm">Domains</h3>
          </div>
          <p className="text-3xl font-semibold text-white">{tenant.stats.domains_count}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-zinc-500" />
            Raw Configuration
          </h2>
          <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
            <pre>
              {JSON.stringify(tenant, null, 2)}
            </pre>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Super Admin Interventions
          </h2>
          <div className="space-y-4">
            <div className="p-4 border border-zinc-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Shadow Login</p>
                <p className="text-sm text-zinc-500">Access dashboard as this tenant</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                    const res = await fetch(`${baseUrl}/admin/tenants/${tenant.id}/impersonate`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${apiKey}` }
                    });
                    if (!res.ok) throw new Error("Impersonation failed");
                    const data = await res.json();
                    localStorage.setItem("auth_token", data.token);
                    window.location.href = "/dashboard";
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : "Request failed");
                  }
                }}
                className="px-4 py-2 bg-zinc-800 text-white hover:bg-zinc-700 transition-colors rounded-lg text-sm font-medium border border-zinc-700"
              >
                Impersonate
              </button>
            </div>

            <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-red-400">Hard Ban</p>
                <p className="text-sm text-zinc-500">Immediately freeze all API access</p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Are you sure you want to suspend ${tenant.name} from the platform?`)) return;
                  try {
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                    const res = await fetch(`${baseUrl}/admin/tenants/${tenant.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`
                      },
                      body: JSON.stringify({ status: "suspended" })
                    });
                    if (!res.ok) throw new Error("Failed to suspend tenant");
                    setTenant({ ...tenant, status: "suspended" });
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : "Request failed");
                  }
                }}
                className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-lg text-sm font-medium border border-red-500/20"
              >
                Ban Tenant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
