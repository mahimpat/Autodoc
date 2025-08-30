'use client';
import Link from 'next/link';
import CommandMenu from './CommandMenu';
import { useEffect, useState } from 'react';
import { UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { API_BASE } from '../lib/api';

function UsageMeter(){
  const [s,setS] = useState<any>(null);
  useEffect(()=>{(async()=>{try{const r=await fetch(`${API_BASE}/billing/status`,{credentials:'include'}); if(r.ok) setS(await r.json());}catch{}})();},[]);
  if(!s) return null;
  const freeCap = 5; const left = s.daily_generations_left ?? 0;
  const used = Math.max(0, freeCap - left);
  const pct = s.tier==='pro'||s.tier==='team' ? 100 : Math.max(0, Math.min(100, (used/freeCap)*100));
  return (
    <div className="hidden md:flex items-center gap-2 text-xs">
      <span className="opacity-75">{s.tier==='free' ? 'Free usage' : s.tier}</span>
      <div className="w-28 h-2 rounded bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className="h-2 bg-emerald-500" style={{width:`${pct}%`}}/>
      </div>
    </div>
  );
}

function AuthStatus() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      // User not authenticated
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      setUser(null);
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 text-sm">
          <UserIcon className="w-4 h-4" />
          <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="flex items-center gap-1"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          <span className="hidden md:inline">Logout</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </Link>
      <Link href="/register">
        <Button variant="primary" size="sm">
          Sign Up
        </Button>
      </Link>
    </div>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:supports-[backdrop-filter]:bg-black/20 border-b border-black/5 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400">AutoDoc Studio</Link>
          <span className="hidden md:inline-block badge">v1.7</span>
        </div>
        <div className="flex items-center gap-3">
          <UsageMeter />
          <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
          <Link href="/studio" className="btn btn-ghost">Studio</Link>
          <Link href="/templates" className="btn btn-ghost">Templates</Link>
          <Link href="/pricing" className="btn btn-ghost">Pricing</Link>
          <Link href="/settings/billing" className="btn">Billing</Link>
          <CommandMenu />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
