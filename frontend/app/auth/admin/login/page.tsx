// app/auth/admin/login/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type LoginResponse = {
  accessToken: string;
};

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay token, mandarlo al dashboard
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) router.replace('/admin');
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError('Ingresá tu email');
    if (!password.trim()) return setError('Ingresá tu contraseña');

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = (await res.json().catch(() => null)) as Partial<LoginResponse> & {
        message?: string | string[];
      };

      if (!res.ok) {
        const msg =
          typeof data?.message === 'string'
            ? data.message
            : Array.isArray(data?.message)
              ? data.message.join(', ')
              : 'Credenciales inválidas';
        throw new Error(msg);
      }

      const accessToken = data?.accessToken;
      if (!accessToken) {
        throw new Error('El backend no devolvió accessToken');
      }

      localStorage.setItem('admin_token', accessToken);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center text-white">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-2xl font-bold">Login Admin</h1>
        <p className="mt-2 text-purple-100">Ingresá para administrar el sistema</p>
      </div>

      <form onSubmit={onSubmit} className="p-8">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="admin@mail.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <strong className="font-semibold">Error:</strong> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Este acceso es solo para administradores.
          </p>
        </div>
      </form>
    </div>
  );
}
