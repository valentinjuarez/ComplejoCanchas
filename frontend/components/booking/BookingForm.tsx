"use client";

import { useMemo, useState } from "react";
import { getAvailability, createReservation } from "@/lib/api";

type Court = { id: number; name: string; type?: string; active: boolean };

export default function BookingForm({ courts }: { courts: Court[] }) {
  const activeCourts = useMemo(() => courts.filter(c => c.active), [courts]);

  const [courtId, setCourtId] = useState<number>(activeCourts[0]?.id ?? 0);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; available: boolean }[]>([]);
  const [selected, setSelected] = useState<{ startTime: string; endTime: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCheckAvailability() {
    setError(null);
    setResult(null);
    setSelected(null);
    setLoading(true);
    try {
      const data = await getAvailability(courtId, date);
      setSlots(data.slots ?? data); // según cómo lo devuelva tu backend
    } catch (e: any) {
      setError(e.message ?? "Error cargando disponibilidad");
    } finally {
      setLoading(false);
    }
  }

  async function onReserve() {
    if (!selected) return setError("Elegí un horario");
    if (!name.trim() || !email.trim()) return setError("Completá nombre y email");

    setError(null);
    setLoading(true);
    try {
      const created = await createReservation({
        name,
        email,
        courtId,
        date,
        startTime: selected.startTime,
        endTime: selected.endTime,
      });
      setResult(created);
    } catch (e: any) {
      setError(e.message ?? "Error creando la reserva");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Selector cancha + fecha */}
      <div className="grid gap-3 md:grid-cols-2">
  <div>
    <label className="text-sm font-medium">Cancha</label>
    <select
  className="w-full border rounded p-2"
  value={courtId}
  onChange={(e) => setCourtId(Number(e.target.value))}
>
  {activeCourts.map((c) => (
    <option key={c.id} value={c.id}>{c.name}</option>
  ))}
  </select>
  </div>

  <div>
  <label className="text-sm font-medium">Fecha</label>
    <input
  type="date"
  className="w-full border rounded p-2"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  />
  </div>
  </div>

  <button
  onClick={onCheckAvailability}
  disabled={loading || !courtId || !date}
  className="w-full md:w-auto bg-black text-white rounded px-4 py-2 disabled:opacity-50"
    >
    {loading ? "Cargando..." : "Ver horarios disponibles"}
    </button>

  {/* Horarios */}
  {slots.length > 0 && (
    <div className="space-y-2">
    <p className="text-sm font-medium">Horarios</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
    {slots.map((s, idx) => (
        <button
          key={idx}
      disabled={!s.available}
    onClick={() => setSelected({ startTime: s.startTime, endTime: s.endTime })}
    className={[
        "border rounded p-2 text-sm",
    !s.available ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50",
      selected?.startTime === s.startTime ? "border-black" : "",
  ].join(" ")}
  >
    {s.startTime} - {s.endTime}
  </button>
  ))}
    </div>
    </div>
  )}

  {/* Datos usuario */}
  <div className="grid gap-3 md:grid-cols-2">
  <div>
    <label className="text-sm font-medium">Nombre</label>
    <input className="w-full border rounded p-2" value={name} onChange={(e) => setName(e.target.value)} />
  </div>
  <div>
  <label className="text-sm font-medium">Email</label>
    <input className="w-full border rounded p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
  </div>
  </div>

  <button
  onClick={onReserve}
  disabled={loading || !selected}
  className="w-full bg-green-600 text-white rounded px-4 py-2 disabled:opacity-50"
    >
    {loading ? "Reservando..." : "Confirmar reserva"}
    </button>

  {/* Errores / Resultado */}
  {error && <div className="border border-red-300 bg-red-50 p-3 rounded text-sm">{error}</div>}

    {result && (
      <div className="border p-3 rounded space-y-2">
      <p className="font-medium">✅ Reserva creada</p>
    <p className="text-sm">Te enviamos un mail con el link de cancelación.</p>

      {/* si tu backend devuelve cancelToken */}
      {result.cancelToken && (
        <div className="text-sm">
        <span className="font-medium">Token:</span> {result.cancelToken}
      <div className="mt-1">
      <a className="underline" href={`/cancel/${result.cancelToken}`}>
        Abrir página de cancelación
      </a>
      </div>
      </div>
      )}
      </div>
    )}
    </div>
  );
  }