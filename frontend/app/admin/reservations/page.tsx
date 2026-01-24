// app/admin/reservations/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type ReservationStatus = 'ACTIVE' | 'CANCELED' | 'COMPLETED';

type AdminReservation = {
  id: number;
  status: ReservationStatus;

  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;

  price: number;
  depositAmount: number;
  refunded: boolean;
  canceledAt: string | Date | null;

  court: { id: number; name: string };
  user: { id: number; name: string; email: string };

  createdAt: string | Date;
  updatedAt?: string | Date | null;
};

type PagedResponse = {
  items: AdminReservation[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

function authHeaders() {
  const t = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString('es-AR');
}

function toDateSafe(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateAR(v: string | Date) {
  const d = toDateSafe(v) ?? new Date();
  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function fmtTimeAR(v: string | Date) {
  const d = toDateSafe(v) ?? new Date();
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function statusPill(status: ReservationStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'CANCELED':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  }
}

function isPagedResponse(x: any): x is PagedResponse {
  return (
    x &&
    typeof x === 'object' &&
    Array.isArray(x.items) &&
    typeof x.page === 'number' &&
    typeof x.limit === 'number'
  );
}

export default function AdminReservationsPage() {
  const [rows, setRows] = useState<AdminReservation[]>([]); // ✅ SIEMPRE ARRAY
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // filtros
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [courtId, setCourtId] = useState<string>(''); // input text
  const [status, setStatus] = useState<ReservationStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // paginación
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const [savingId, setSavingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const [token] = useState<string | null>(() => getAdminToken()); // ✅ sin hydration issues

  const isAuthed = useMemo(() => Boolean(token), [token]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  function buildQuery() {
    const q = new URLSearchParams();
    if (name.trim()) q.set('name', name.trim());
    if (email.trim()) q.set('email', email.trim());
    if (date.trim()) q.set('date', date.trim());
    if (courtId.trim()) q.set('courtId', courtId.trim());
    if (status) q.set('status', status);
    if (from.trim()) q.set('from', from.trim());
    if (to.trim()) q.set('to', to.trim());
    q.set('page', String(page));
    q.set('limit', String(limit));
    return q.toString();
  }

  async function loadReservations() {
    if (!isAuthed) return;

    try {
      setLoading(true);
      setError(null);

      const qs = buildQuery();
      const res = await fetch(`${API_URL}/admin/reservations?${qs}`, {
        headers: authHeaders(),
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error cargando reservas (${res.status})`);
      }

      const data = await res.json();

      // ✅ soportar: array | {items,...} | {data:[...]} (por si tu service devuelve otro wrapper)
      if (Array.isArray(data)) {
        setRows(data);
        setTotal(null);
        setTotalPages(null);
      } else if (isPagedResponse(data)) {
        setRows(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === 'number' ? data.total : null);
        setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : null);
      } else if (Array.isArray(data?.items)) {
        setRows(data.items);
        setTotal(typeof data.total === 'number' ? data.total : null);
        setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : null);
      } else if (Array.isArray(data?.data)) {
        setRows(data.data);
        setTotal(typeof data.total === 'number' ? data.total : null);
        setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : null);
      } else {
        // ✅ fallback ultra defensivo
        setRows([]);
        setTotal(null);
        setTotalPages(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cargando reservas';
      setError(msg);
      setRows([]); // ✅ nunca undefined
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, page, limit]);

  function applyFilters() {
    setPage(1);
    void loadReservations();
  }

  function resetFilters() {
    setName('');
    setEmail('');
    setDate('');
    setCourtId('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    void loadReservations();
  }

  async function cancelReservation(id: number) {
    const ok = window.confirm('¿Cancelar esta reserva? (Admin puede cancelar cualquier reserva)');
    if (!ok) return;

    try {
      setCancelingId(id);
      setError(null);

      const res = await fetch(`${API_URL}/admin/reservations/${id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error cancelando (${res.status})`);
      }

      const updated = (await res.json()) as AdminReservation;
      setRows((prev) => (Array.isArray(prev) ? prev.map((r) => (r.id === id ? updated : r)) : [updated]));
      showToast('✅ Reserva cancelada');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cancelando reserva';
      setError(msg);
    } finally {
      setCancelingId(null);
    }
  }

  async function updateStatus(id: number, next: ReservationStatus) {
    try {
      setSavingId(id);
      setError(null);

      const res = await fetch(`${API_URL}/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error actualizando (${res.status})`);
      }

      const updated = (await res.json()) as AdminReservation;
      setRows((prev) => (Array.isArray(prev) ? prev.map((r) => (r.id === id ? updated : r)) : [updated]));
      showToast('✅ Estado actualizado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error actualizando reserva';
      setError(msg);
    } finally {
      setSavingId(null);
    }
  }

  // 🔒 Si no hay token, mejor mostrar aviso (el layout igual te redirige)
  if (!isAuthed) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <div className="text-slate-900 font-semibold">No autenticado</div>
          <div className="text-slate-600 mt-1">Redirigiendo al login…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reservas</h1>
          <p className="mt-2 text-slate-600">
            Gestioná reservas: filtros, estado, cancelación y detalles (total + seña).
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => loadReservations()}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Actualizando…' : '↻ Refrescar'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <strong className="font-semibold">Error:</strong> {error}
        </div>
      )}

      {/* Filters */}
      <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
          <div className="font-semibold">Filtros</div>
          <div className="text-sm text-white/80">Buscá por usuario, fecha, cancha o estado</div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nombre
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@gmail.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fecha exacta
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cancha ID
              </label>
              <input
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                placeholder="Ej: 1"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReservationStatus | '')}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="">Todos</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Desde
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Hasta
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Límite
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="font-semibold text-slate-900">Listado</div>
          <div className="text-sm text-slate-500">
            {total !== null ? (
              <>
                {total} reserva(s){totalPages ? ` · ${page}/${totalPages}` : ''}
              </>
            ) : (
              `${(rows ?? []).length} reserva(s)`
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-slate-600">
            <div className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            <span className="ml-3">Cargando reservas…</span>
          </div>
        ) : (rows ?? []).length === 0 ? (
          <div className="p-8 text-slate-600">No hay reservas con esos filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Cancha</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Horario</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Seña</th>
                <th className="px-6 py-4">Reembolso</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
              {(rows ?? []).map((r) => {
                const dateLabel = fmtDateAR(r.startTime);
                const timeLabel = `${fmtTimeAR(r.startTime)} - ${fmtTimeAR(r.endTime)}`;

                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">#{r.id}</td>

                    <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPill(
                            r.status,
                          )}`}
                        >
                          {r.status}
                        </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{r.court?.name ?? '-'}</div>
                      <div className="text-xs text-slate-500">ID {r.court?.id ?? '-'}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{r.user?.name ?? '-'}</div>
                      <div className="text-xs text-slate-500">{r.user?.email ?? '-'}</div>
                    </td>

                    <td className="px-6 py-4">{dateLabel}</td>
                    <td className="px-6 py-4">{timeLabel}</td>

                    <td className="px-6 py-4 font-semibold text-slate-900">${fmtMoney(r.price)}</td>

                    <td className="px-6 py-4 font-semibold text-purple-700">
                      ${fmtMoney(r.depositAmount)}
                    </td>

                    <td className="px-6 py-4">
                      {r.refunded ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            Sí
                          </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            No
                          </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void cancelReservation(r.id)}
                          disabled={cancelingId === r.id || r.status === 'CANCELED'}
                          className="rounded-lg border-2 border-red-600 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancelingId === r.id ? 'Cancelando…' : 'Cancelar'}
                        </button>

                        <select
                          value={r.status}
                          onChange={(e) =>
                            void updateStatus(r.id, e.target.value as ReservationStatus)
                          }
                          disabled={savingId === r.id}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELED">CANCELED</option>
                        </select>
                      </div>

                      {r.canceledAt && (
                        <div className="mt-2 text-xs text-slate-500">
                          Cancelada: {fmtDateAR(r.canceledAt)} {fmtTimeAR(r.canceledAt)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages && totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ← Anterior
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
