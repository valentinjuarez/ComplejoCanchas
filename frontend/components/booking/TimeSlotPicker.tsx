import React, { useMemo, useEffect } from 'react';

const SLOTS = [
  '08:00','09:00','10:00','11:00','12:00','13:00','14:00',
  '15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
];

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m, 0);
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function minutesFromHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

type Props = {
  occupied: string[];
  loading: boolean;
  value: string;
  onChange: (time: string) => void;
  dateISO: string; // 👈 NUEVO: fecha seleccionada YYYY-MM-DD
};

export default function TimeSlotPicker({
                                         occupied,
                                         loading,
                                         value,
                                         onChange,
                                         dateISO,
                                       }: Props) {
  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const isToday = dateISO === todayISO();

  // ✅ disponibles = no ocupados y (si es hoy) que sean posteriores a "ahora"
  const availableSlots = useMemo(() => {
    return SLOTS.filter((slot) => {
      if (occupied.includes(slot)) return false;
      if (isToday && minutesFromHHMM(slot) <= nowMinutes) return false;
      return true;
    });
  }, [occupied, isToday, nowMinutes]);

  const availableCount = availableSlots.length;

  // ✅ si el value quedó inválido, elegimos el primero disponible
  useEffect(() => {
    if (loading) return;
    if (availableSlots.length === 0) return;
    if (!availableSlots.includes(value)) {
      onChange(availableSlots[0]);
    }
  }, [loading, availableSlots, value, onChange]);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        🕐 Horario (1 hora)
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || availableSlots.length === 0}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-50"
      >
        {availableSlots.map((slot) => (
          <option key={slot} value={slot}>
            ✓ {slot} - {addOneHour(slot)}
          </option>
        ))}
      </select>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {loading ? 'Cargando disponibilidad…' : `${availableCount} horarios disponibles`}
        </span>

        {!loading && availableCount > 0 && (
          <span className="text-green-600 font-medium">✓ Hay turnos libres</span>
        )}

        {!loading && availableCount === 0 && (
          <span className="text-red-600 font-medium">✗ Sin turnos disponibles</span>
        )}
      </div>
    </div>
  );
}
