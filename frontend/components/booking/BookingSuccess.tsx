import type { ReservationPublicResponse } from '@/lib/api';
import { useState } from 'react';

type Props = {
  reservation: ReservationPublicResponse;
  onBookAnother?: () => void;
  onGoHome?: () => void;
};

export default function BookingSuccess({
                                         reservation,
                                         onBookAnother,
                                         onGoHome,
                                       }: Props) {
  const [copied, setCopied] = useState(false);

  function copyToken() {
    if (reservation.cancelToken) {
      navigator.clipboard.writeText(reservation.cancelToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-center text-white">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
          <span className="text-5xl">✓</span>
        </div>
        <h2 className="text-3xl font-bold">¡Reserva Confirmada!</h2>
        <p className="mt-2 text-green-100">Tu turno está asegurado</p>
      </div>

      <div className="p-8">
        <div className="mb-6 rounded-2xl bg-blue-50 p-6">
          <div className="mb-2 text-lg font-semibold text-blue-900">
            📧 Confirmación por Email
          </div>
          <p className="text-sm text-blue-700">
            Te enviamos un email a <strong>{reservation.user.email}</strong> con
            todos los detalles de tu reserva.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-6 text-center">
            <div className="text-sm font-medium text-purple-700">
              Número de Reserva
            </div>
            <div className="mt-2 text-4xl font-bold text-purple-900">
              #{reservation.id}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="mb-2 text-sm font-semibold text-gray-700">
              Detalles de la Reserva
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cancha:</span>
                <span className="font-medium">{reservation.court.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium">
                  {new Date(reservation.startTime).toLocaleDateString('es-AR')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Horario:</span>
                <span className="font-medium">
                  {new Date(reservation.startTime).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(reservation.endTime).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Total:</span>
                <span className="text-lg font-bold text-purple-600">
                  ${reservation.price.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="mb-2 text-sm font-medium text-gray-700">
              🔑 Token de Cancelación
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-gray-100 px-3 py-2 text-xs font-mono">
                {reservation.cancelToken}
              </code>
              <button
                onClick={copyToken}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                {copied ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Guardá este token para cancelar tu reserva si es necesario
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-purple-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-purple-900">
            🏟️ Al llegar al complejo
          </h3>
          <p className="text-purple-700">
            Indicá tu número de reserva{' '}
            <strong className="text-2xl">#{reservation.id}</strong> en recepción.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() =>
              onBookAnother ? onBookAnother() : window.location.reload()
            }
            className="w-full rounded-xl border-2 border-purple-600 px-6 py-3 font-semibold text-purple-600 transition hover:bg-purple-50"
          >
            Hacer otra reserva
          </button>

          {/* ✅ BOTÓN NUEVO: cancelar con token (va a /cancelar?token=...) */}
          {reservation.cancelToken && (
            <a
              href={`/cancelar?token=${reservation.cancelToken}`}
              className="block w-full rounded-xl border-2 border-red-600 px-6 py-3 text-center font-semibold text-red-600 transition hover:bg-red-50"
            >
              Cancelar esta reserva
            </a>
          )}

          <button
            onClick={() =>
              onGoHome ? onGoHome() : (window.location.href = '/')
            }
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 sm:col-span-2"
          >
            Volver al Home
          </button>
        </div>
      </div>
    </div>
  );
}
