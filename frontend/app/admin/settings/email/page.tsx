// app/admin/settings/email/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

export default function AdminChangeEmailPage() {
  const router = useRouter();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/auth/admin/login');
      return;
    }
    setChecking(false);
  }, [router]);

  function validate() {
    if (!newEmail.trim()) return 'Ingresá el nuevo email';
    if (!/^\S+@\S+\.\S+$/.test(newEmail.trim()))
      return 'Ingresá un email válido';
    if (!currentPassword.trim()) return 'Ingresá tu contraseña actual';
    if (currentPassword.trim().length < 6)
      return 'La contraseña debe tener al menos 6 caracteres';
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    const v = validate();
    if (v) return setError(v);

    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/auth/admin/login');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/admin/me/email`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newEmail: newEmail.trim().toLowerCase(),
          currentPassword: currentPassword.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          'No se pudo cambiar el email';
        throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
      }

      setOk('✅ Email actualizado correctamente');
      setCurrentPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <div className="text-white">Verificando acceso...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-10">
      <div className="absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            ← Volver al panel
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Cambiar Email</h1>
            <p className="text-purple-100">
              Actualizá el correo del administrador
            </p>
          </div>

          <form onSubmit={onSubmit} className="p-8">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  📧 Nuevo email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  🔒 Contraseña actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Por seguridad, pedimos tu contraseña para confirmar el cambio.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <strong className="font-semibold">❌ Error:</strong> {error}
                </div>
              )}

              {ok && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                  <strong className="font-semibold">{ok}</strong>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando…' : 'Guardar cambios'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="w-full rounded-xl border-2 border-purple-600 px-6 py-3 font-semibold text-purple-600 transition hover:bg-purple-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 rounded-2xl bg-white/70 p-4 text-sm text-gray-600 shadow-sm backdrop-blur">
          Tip: si cambiás el email, tu sesión sigue válida (token), pero conviene
          volver a iniciar sesión si en el futuro agregás verificación server-side.
        </div>
      </div>
    </main>
  );
}
