// components/booking/BookingSummary.tsx
import type { Court } from '@/lib/api';

type Props = {
  court?: Court;
  date: string;
  startTime: string;
  endTime: string;
};

function calculateDuration(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return (endMinutes - startMinutes) / 60;
}

export default function BookingSummary({ court, date, startTime, endTime }: Props) {
  const hours = calculateDuration(startTime, endTime);
  const pricePerHour = court?.pricePerHour ?? 72000;
  const totalPrice = hours * pricePerHour;
  const playersCount = court?.playersCount ?? 10;
  const depositAmount = Math.round((totalPrice / playersCount) / 100) * 100;

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
            {startTime} - {endTime} ({hours}h)
          </div>
        </div>

        <div className="mt-6 rounded-lg border-2 border-purple-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
            <span>${pricePerHour.toLocaleString('es-AR')} × {hours}h</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-semibold text-gray-700">Total a pagar</span>
            <span className="text-3xl font-bold text-purple-600">
              ${totalPrice.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Seña (pagás ahora)</span>
              <span className="text-2xl font-bold text-blue-600">
                    ${depositAmount.toLocaleString('es-AR')}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Se calcula como 1 jugador ({playersCount} jugadores). El resto se paga en el complejo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}