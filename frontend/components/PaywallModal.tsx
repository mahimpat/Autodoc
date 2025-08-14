'use client';
import { useRouter } from 'next/navigation';
import { API_BASE } from '../lib/api';

export default function PaywallModal({ open, onClose }:{ open:boolean; onClose:()=>void }) {
  const r = useRouter();
  const goCheckout = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, { method:'POST', credentials:'include' });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } catch {}
  };
  const goPortal = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/portal`, { method:'POST', credentials:'include' });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } catch {}
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-semibold mb-2">Upgrade to continue</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">You’ve reached the free plan limit. Upgrade to Pro for higher limits and faster generation.</p>
        <div className="flex items-center gap-2 justify-end">
          <button className="btn" onClick={onClose}>Not now</button>
          <button className="btn" onClick={goPortal}>Manage</button>
          <button className="btn btn-primary" onClick={goCheckout}>Upgrade</button>
        </div>
      </div>
    </div>
  );
}
