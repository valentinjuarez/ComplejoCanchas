'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookingSuccess from '@/components/booking/BookingSuccess';
import { getReservationById } from '@/lib/api';
import type { ReservationPublicResponse } from '@/lib/api';

export default function PagoSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const rid = useMemo(() => Number(sp.get('rid')), [sp]);

  const [reservation, setReservation] = useState<ReservationPublicResponse | null>(null);
  const [status, setStatus] = useState<string>('Cargando…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(rid) || rid <= 0) {
      setError('Falta rid en la URL.');
      return;
    }

    let cancelled = false;

    async function poll() {
      setError(null);
      setStatus('Confirmando pago…');

      const maxAttempts = 18; // ~30-40s
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;

        try {
          const r = await getReservationById(rid);

          // ✅ cuando el webhook la pone ACTIVE, mostramos success
          if (r.status === 'ACTIVE') {
            setReservation(r);
            return;
          }

          // si MP vuelve a success pero todavía está PENDING_PAYMENT, seguimos esperando
          if (r.status === 'PENDING_PAYMENT') {
            setStatus('Pago recibido. Esperando confirmación…');
          } else if (r.status === 'EXPIRED') {
            setError('La reserva expiró antes de confirmarse el pago.');
            return;
          } else if (r.status === 'CANCELED') {
            setError('La reserva fue cancelada.');
            return;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Error consultando la reserva';
          setStatus('Reintentando…');
          // no cortamos por error transitorio
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      setError('No pudimos confirmar el pago todavía. Reintentá en unos segundos.');
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [rid]);

  if (reservation) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <BookingSuccess
          reservation={reservation}
          onBookAnother={() => router.push('/reservar')}
          onGoHome={() => router.push('/')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Procesando…</h1>
        <p className="mt-2 text-gray-600">{status}</p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <strong>❌</strong> {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
          >
            Reintentar
          </button>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold text-white"
          >
            Volver al Home
          </button>
        </div>
      </div>
    </div>
  );
}
