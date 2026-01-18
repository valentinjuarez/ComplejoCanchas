import type { Court } from '@/lib/api';

type Props = {
  court?: Court;
  date: string;
  startTime: string;
  endTime: string;
};

// ✅ PRECIO FIJO DESDE BACKEND (6000)
const PRICE_PER_HOUR = 6000;

export default function BookingSummary({ court, date, startTime, endTime }: Props) {
  return (
    <div className="sticky top-4 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Resumen de Reserva</h3>

      <div className="space-y-4">
        <div className="rounded-lg bg-white p-4">
          <div className="text-sm text-gray-500">Cancha</div>
          <div className="font-semibold text-gray-900">
            {court?.name ?? '...'} · {court?.type ?? '...'}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4">
          <div className="text-sm text-gray-500">Fecha</div>
          <div className="font-semibold text-gray-900">
            {new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4">
          <div className="text-sm text-gray-500">Horario</div>
          <div className="font-semibold text-gray-900">
            {startTime} - {endTime}
          </div>
        </div>

        <div className="mt-6 rounded-lg border-2 border-purple-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">Total a pagar</span>
            <span className="text-3xl font-bold text-purple-600">
              ${PRICE_PER_HOUR.toLocaleString('es-AR')}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Precio por 1 hora de cancha
          </p>
        </div>
      </div>
    </div>
  );
}