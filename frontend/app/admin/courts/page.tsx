// app/admin/courts/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Court = {
  id: number;
  name: string;
  type: string;
  active: boolean;
  pricePerHour: number;
  playersCount: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

function formatMoneyARS(value: number) {
  return value.toLocaleString('es-AR');
}

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('F5');
  const [newPrice, setNewPrice] = useState<number>(72000);
  const [newPlayers, setNewPlayers] = useState<number>(10);
  const [newActive, setNewActive] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  // Inline edits
  const [draft, setDraft] = useState<Record<number, Partial<Court>>>({});

  const token = useMemo(() => getAdminToken(), []);

  function authHeaders() {
    const t = getAdminToken();
    return {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function loadCourts() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/admin/courts`, {
        headers: authHeaders(),
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error cargando canchas (${res.status})`);
      }

      const data = (await res.json()) as Court[];
      setCourts(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cargando canchas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // si no hay token, el layout ya redirige; acá solo evitamos requests
    if (!token) return;
    loadCourts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function getRowDraft(id: number): Partial<Court> {
    return draft[id] ?? {};
  }

  function setRowDraft(id: number, patch: Partial<Court>) {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function hasChanges(c: Court) {
    const d = getRowDraft(c.id);
    return (
      (d.name !== undefined && d.name !== c.name) ||
      (d.type !== undefined && d.type !== c.type) ||
      (d.pricePerHour !== undefined && d.pricePerHour !== c.pricePerHour) ||
      (d.playersCount !== undefined && d.playersCount !== c.playersCount)
    );
  }

  async function saveCourt(c: Court) {
    const d = getRowDraft(c.id);
    const payload: Record<string, unknown> = {};

    // armamos payload solo con campos editados
    if (d.name !== undefined && d.name.trim() !== c.name) payload.name = d.name.trim();
    if (d.type !== undefined && d.type.trim() !== c.type) payload.type = d.type.trim();
    if (d.pricePerHour !== undefined && Number(d.pricePerHour) !== c.pricePerHour)
      payload.pricePerHour = Number(d.pricePerHour);
    if (d.playersCount !== undefined && Number(d.playersCount) !== c.playersCount)
      payload.playersCount = Number(d.playersCount);

    if (Object.keys(payload).length === 0) return;

    try {
      setSavingId(c.id);
      setError(null);

      const res = await fetch(`${API_URL}/admin/courts/${c.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error guardando (${res.status})`);
      }

      const updated = (await res.json()) as Court;

      setCourts((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      setDraft((prev) => {
        const copy = { ...prev };
        delete copy[c.id];
        return copy;
      });

      showToast('✅ Cambios guardados');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error guardando cambios';
      setError(msg);
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(c: Court) {
    const next = !c.active;

    // optimista
    setCourts((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: next } : x)));

    try {
      setTogglingId(c.id);
      setError(null);

      const res = await fetch(`${API_URL}/admin/courts/${c.id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error toggle (${res.status})`);
      }

      const updated = (await res.json()) as Court;
      setCourts((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      showToast(updated.active ? '✅ Cancha activada' : '✅ Cancha desactivada');
    } catch (e) {
      // revert si falla
      setCourts((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: c.active } : x)));
      const msg = e instanceof Error ? e.message : 'Error cambiando estado';
      setError(msg);
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteCourt(c: Court) {
    const ok = window.confirm(
      `¿Eliminar la cancha "${c.name}"? Si tiene reservas asociadas, el backend lo va a impedir.`,
    );
    if (!ok) return;

    try {
      setDeletingId(c.id);
      setError(null);

      const res = await fetch(`${API_URL}/admin/courts/${c.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error eliminando (${res.status})`);
      }

      setCourts((prev) => prev.filter((x) => x.id !== c.id));
      showToast('🗑️ Cancha eliminada');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error eliminando cancha';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  async function createCourt() {
    if (!newName.trim()) {
      setError('Ingresá un nombre');
      return;
    }
    if (!newType.trim()) {
      setError('Ingresá un tipo (ej: F5 / F6)');
      return;
    }
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      setError('Precio inválido');
      return;
    }
    if (!Number.isFinite(newPlayers) || newPlayers < 1) {
      setError('PlayersCount inválido');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`${API_URL}/admin/courts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: newName.trim(),
          type: newType.trim(),
          active: newActive,
          pricePerHour: Number(newPrice),
          playersCount: Number(newPlayers),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error creando (${res.status})`);
      }

      const created = (await res.json()) as Court;

      setCourts((prev) => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateOpen(false);
      setNewName('');
      setNewType('F5');
      setNewPrice(72000);
      setNewPlayers(10);
      setNewActive(true);

      showToast('🎉 Cancha creada');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error creando cancha';
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Canchas</h1>
          <p className="mt-2 text-slate-600">
            Administrá canchas: crear, editar, activar/desactivar, precio y jugadores.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => loadCourts()}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Actualizando…' : '↻ Refrescar'}
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700"
          >
            + Nueva cancha
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

      {/* Create Modal */}
      {createOpen && (
        <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Crear cancha</h2>
                <p className="text-white/80">Completá los datos de la nueva cancha</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-2 font-semibold text-white transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Cancha 1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
                <input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Ej: F5 / F6"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Precio por hora</label>
                <input
                  type="number"
                  min={0}
                  value={Number.isFinite(newPrice) ? newPrice : 0}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cantidad de jugadores
                </label>
                <input
                  type="number"
                  min={1}
                  value={Number.isFinite(newPlayers) ? newPlayers : 1}
                  onChange={(e) => setNewPlayers(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={newActive}
                    onChange={(e) => setNewActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Activa</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void createCourt()}
                disabled={creating}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creando…' : '✓ Crear cancha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="font-semibold text-slate-900">Listado</div>
          <div className="text-sm text-slate-500">{courts.length} cancha(s)</div>
        </div>

        {loading ? (
          <div className="p-8 text-slate-600">
            <div className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            <span className="ml-3">Cargando canchas…</span>
          </div>
        ) : courts.length === 0 ? (
          <div className="p-8 text-slate-600">No hay canchas cargadas.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {courts.map((c) => {
              const d = getRowDraft(c.id);
              const effectiveName = d.name ?? c.name;
              const effectiveType = d.type ?? c.type;
              const effectivePrice = d.pricePerHour ?? c.pricePerHour;
              const effectivePlayers = d.playersCount ?? c.playersCount;

              const depositPerPlayer =
                Number(effectivePlayers) > 0 ? Number(effectivePrice) / Number(effectivePlayers) : 0;

              return (
                <div key={c.id} className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                            c.active
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                          }`}
                        >
                          <span>{c.active ? '●' : '○'}</span>
                          {c.active ? 'Activa' : 'Inactiva'}
                        </span>

                        <span className="text-sm text-slate-500">ID #{c.id}</span>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Nombre
                          </label>
                          <input
                            value={String(effectiveName)}
                            onChange={(e) => setRowDraft(c.id, { name: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Tipo
                          </label>
                          <input
                            value={String(effectiveType)}
                            onChange={(e) => setRowDraft(c.id, { type: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Precio/hora
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={Number(effectivePrice)}
                            onChange={(e) => setRowDraft(c.id, { pricePerHour: Number(e.target.value) })}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                          <div className="mt-1 text-xs text-slate-500">
                            ${formatMoneyARS(Number(effectivePrice))}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Jugadores
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={Number(effectivePlayers)}
                            onChange={(e) => setRowDraft(c.id, { playersCount: Number(e.target.value) })}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                          <div className="mt-1 text-xs text-slate-500">
                            Seña por jugador aprox: ${formatMoneyARS(Math.round(depositPerPlayer))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 lg:w-[260px]">
                      <button
                        type="button"
                        onClick={() => void toggleActive(c)}
                        disabled={togglingId === c.id}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {togglingId === c.id ? 'Cambiando…' : c.active ? 'Desactivar' : 'Activar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void saveCourt(c)}
                        disabled={savingId === c.id || !hasChanges(c)}
                        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                      >
                        {savingId === c.id ? 'Guardando…' : '✓ Guardar cambios'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteCourt(c)}
                        disabled={deletingId === c.id}
                        className="w-full rounded-xl border-2 border-red-600 bg-white px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === c.id ? 'Eliminando…' : '🗑️ Eliminar'}
                      </button>

                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Precio actual</span>
                          <span className="font-semibold text-slate-900">
                            ${formatMoneyARS(c.pricePerHour)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-medium">Jugadores</span>
                          <span className="font-semibold text-slate-900">{c.playersCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Helper row */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                    <span>
                      💡 Seña por jugador (aprox):{' '}
                      <strong className="text-slate-900">
                        ${formatMoneyARS(Math.round(depositPerPlayer))}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      Total/hora: <strong className="text-slate-900">${formatMoneyARS(Number(effectivePrice))}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
