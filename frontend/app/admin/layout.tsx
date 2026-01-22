// app/admin/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  // Dropdown usuario
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('admin_token'));
  }, []);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthed) router.replace('/auth/admin/login');
  }, [mounted, isAuthed, router]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function handleLogout() {
    localStorage.removeItem('admin_token');
    setToken(null); // fuerza estado no authed
    router.replace('/auth/admin/login');
  }

  // ✅ Mientras NO montó o está redirigiendo, mostramos SIEMPRE lo mismo (evita mismatch)
  if (!mounted || !isAuthed) {
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
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚙️</span>
              <span className="text-xl font-bold text-white">Panel de Admin</span>
            </div>

            <div className="hidden items-center gap-6 md:flex">
              <Link
                href="/admin"
                className={`font-medium transition ${
                  pathname === '/admin' ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                Dashboard
              </Link>

              <Link
                href="/admin/reservations"
                className={`font-medium transition ${
                  pathname?.startsWith('/admin/reservations')
                    ? 'text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Reservas
              </Link>

              <Link
                href="/admin/courts"
                className={`font-medium transition ${
                  pathname?.startsWith('/admin/courts')
                    ? 'text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Canchas
              </Link>

              {/* ✅ Menú usuario (emoji) */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <span className="text-xl">👤</span>
                  <span className="hidden lg:inline">Cuenta</span>
                  <span className="text-sm">{userMenuOpen ? '▲' : '▼'}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                    <div className="px-4 py-3">
                      <div className="text-xs font-semibold text-gray-500">ADMIN</div>
                      <div className="text-sm font-semibold text-gray-900">Configuración</div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="p-2">
                      <Link
                        href="/admin/settings/email"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        📧 Cambiar email
                      </Link>

                      <Link
                        href="/admin/settings/password"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        🔒 Cambiar contraseña
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        🚪 Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-white md:hidden"
              aria-label="Toggle navigation menu"
            >
              <span className="text-2xl">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-white/10 py-4 md:hidden">
              <div className="flex flex-col gap-2">
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-2 font-medium transition ${
                    pathname === '/admin'
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>

                <Link
                  href="/admin/reservations"
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-2 font-medium transition ${
                    pathname?.startsWith('/admin/reservations')
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Reservas
                </Link>

                <Link
                  href="/admin/courts"
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-2 font-medium transition ${
                    pathname?.startsWith('/admin/courts')
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Canchas
                </Link>

                <Link
                  href="/admin/settings/email"
                  onClick={() => setMenuOpen(false)}
                  className="mx-4 rounded-lg bg-white/10 px-4 py-2 font-medium text-white/90 hover:bg-white/20"
                >
                  📧 Cambiar email
                </Link>

                <Link
                  href="/admin/settings/password"
                  onClick={() => setMenuOpen(false)}
                  className="mx-4 rounded-lg bg-white/10 px-4 py-2 font-medium text-white/90 hover:bg-white/20"
                >
                  🔒 Cambiar contraseña
                </Link>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="mx-4 mt-2 rounded-lg bg-white/20 px-4 py-2 font-semibold text-white hover:bg-white/30"
                >
                  🚪 Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="pb-12">{children}</main>

      <footer className="border-t bg-white py-6 text-center text-sm text-gray-600">
        <p>Panel de Administración - Reservá tu Cancha © 2025</p>
      </footer>
    </div>
  );
}
