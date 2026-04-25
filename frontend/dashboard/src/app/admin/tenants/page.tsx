"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Terminal, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  mode: string;
  status: string;
  plan: string;
  plan_email_limit: number;
  created_at: string;
}

export default function TenantsList({ apiKey }: { apiKey: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tenant>>({});

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const res = await fetch(`${baseUrl}/admin/tenants`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("Invalid master key or unauthorized");
      const data = await res.json();
      setTenants(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const updateTenant = async (id: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const res = await fetch(`${baseUrl}/admin/tenants/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error("Failed to update tenant");
      
      setEditingId(null);
      fetchTenants(); // refresh list
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Request failed");
    }
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl flex flex-col items-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-white text-lg font-medium mb-2">Access Denied</h2>
        <p className="text-red-400 font-mono text-sm">{error}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-zinc-500 font-mono flex items-center gap-2"><div className="w-2 h-2 bg-red-500 animate-pulse rounded-full" /> Loading control plane...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-white font-medium flex items-center gap-2">
          <Terminal className="h-5 w-5 text-zinc-500" />
          Global Tenants ({tenants.length})
        </h2>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-950/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Tenant</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Plan / Limit</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Created</th>
              <th scope="col" className="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <Link href={`/admin/tenants/${tenant.id}`} className="text-sm font-medium text-white hover:text-red-400 transition-colors underline-offset-4 hover:underline">
                      {tenant.name}
                    </Link>
                    <span className="text-xs font-mono text-zinc-500 mt-1">{tenant.email}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {editingId === tenant.id ? (
                    <div className="flex gap-2 items-center">
                      <select 
                        className="bg-zinc-950 border border-zinc-700 rounded text-sm text-white px-2 py-1 focus:ring-red-500"
                        value={editForm.plan || tenant.plan}
                        onChange={(e) => setEditForm({...editForm, plan: e.target.value})}
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                      <input 
                        type="number"
                        className="w-24 bg-zinc-950 border border-zinc-700 rounded text-sm text-white px-2 py-1 font-mono"
                        value={editForm.plan_email_limit ?? tenant.plan_email_limit}
                        onChange={(e) => setEditForm({...editForm, plan_email_limit: parseInt(e.target.value)})}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 w-fit capitalize border border-zinc-700 shadow-inner">
                        {tenant.plan || 'Free'}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">Max: {tenant.plan_email_limit?.toLocaleString() || 100}</span>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === tenant.id ? (
                    <select 
                      className="bg-zinc-950 border border-zinc-700 rounded text-sm text-white px-2 py-1 focus:ring-red-500"
                      value={editForm.status || tenant.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending_compliance">Pending Compliance</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {tenant.status === 'active' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${tenant.status === 'active' ? 'text-zinc-300' : 'text-red-400'}`}>
                        {tenant.status === 'pending_compliance' ? 'In Review' : tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 font-mono">
                  {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingId === tenant.id ? (
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => updateTenant(tenant.id)} className="text-emerald-400 hover:text-emerald-300 font-mono">SAVE</button>
                      <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-zinc-400 font-mono">CANCEL</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setEditingId(tenant.id);
                        setEditForm({ plan: tenant.plan, plan_email_limit: tenant.plan_email_limit, status: tenant.status });
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors font-mono hover:bg-red-500/10 px-3 py-1 rounded"
                    >
                      OVERRIDE
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
