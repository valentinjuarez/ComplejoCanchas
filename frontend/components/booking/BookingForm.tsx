'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Court, ReservationPublicResponse } from '@/lib/api';
import { createReservation, getAvailability } from '@/lib/api';
import CourtSelector from './CourtSelector';
import DatePicker from './DatePicker';
import TimeSlotPicker from './TimeSlotPicker';
import BookingSummary from './BookingSummary';
import BookingSuccess from './BookingSuccess';

type Props = {
  courts: Court[];
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addOneHour(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const d = new Date(2000, 0, 1, h, m, 0);
  d.setHours(d.getHours() + 1);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function BookingForm({ courts }: Props) {
  const router = useRouter();
  const activeCourts = useMemo(() => courts.filter((c) => c.active), [courts]);

  const [courtId, setCourtId] = useState<number>(
    activeCourts[0]?.id ?? courts[0]?.id ?? 0,
  );
  const [date, setDate] = useState<string>(todayISO());
  const [startTime, setStartTime] = useState<string>('18:00');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const [occupied, setOccupied] = useState<string[]>([]);
  const [loadingAvail, setLoadingAvail] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ReservationPublicResponse | null>(null);

  const endTime = useMemo(() => addOneHour(startTime), [startTime]);
  const selectedCourt = useMemo(
    () => activeCourts.find((c) => c.id === courtId),
    [activeCourts, courtId],
  );

  function resetForm() {
    setSuccess(null);
    setError(null);
    setCreating(false);

    const firstCourt = activeCourts[0]?.id ?? courts[0]?.id ?? 0;
    setCourtId(firstCourt);
    setDate(todayISO());
    setStartTime('18:00');

    setName('');
    setEmail('');
  }

  // Cargar disponibilidad
  useEffect(() => {
    if (!courtId || !date) return;

    let cancelled = false;

    async function load() {
      try {
        setLoadingAvail(true);
        setError(null);

        const res = await getAvailability(courtId, date);
        if (cancelled) return;

        const occupiedTimes = res.occupiedSlots.map((slot) => slot.startTime);
        setOccupied(occupiedTimes);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error cargando disponibilidad';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoadingAvail(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [courtId, date]);

  async function onSubmit() {
    setSuccess(null);
    setError(null);

    if (!courtId) return setError('Seleccioná una cancha');
    if (!name.trim()) return setError('Ingresá tu nombre');
    if (!email.trim()) return setError('Ingresá tu email');

    try {
      setCreating(true);

      const res = await createReservation({
        name: name.trim(),
        email: email.trim(),
        courtId,
        date,
        startTime,
        endTime,
      });

      setSuccess(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error creando reserva';
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  if (success) {
    return (
      <BookingSuccess
        reservation={success}
        onBookAnother={() => {
          resetForm();
          router.push('/');
        }}
        onGoHome={() => router.push('/')}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              resetForm();
              router.push('/');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            ← Volver al inicio
          </button>
        </div>

        <h2 className="text-2xl font-bold">Nueva Reserva</h2>
        <p className="text-purple-100">Completá los datos para confirmar</p>
      </div>

      <div className="p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <CourtSelector courts={activeCourts} value={courtId} onChange={setCourtId} />

            <DatePicker value={date} onChange={setDate} />

            <TimeSlotPicker
              occupied={occupied}
              loading={loadingAvail}
              value={startTime}
              onChange={setStartTime}
              dateISO={date}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                👤 Nombre completo
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                📧 Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="juan@gmail.com"
              />
            </div>
          </div>

          {/* Right Column - Summary */}
          <div>
            <BookingSummary court={selectedCourt} date={date} startTime={startTime} endTime={endTime} />
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <strong className="font-semibold">❌ Error:</strong> {error}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={creating || activeCourts.length === 0}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
        >
          {creating ? 'Confirmando…' : '✓ Confirmar Reserva'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          📬 Recibirás un email con los detalles y el código para cancelar
        </p>
      </div>
    </div>
  );
}
