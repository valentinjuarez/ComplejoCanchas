// frontend/app/reservar/page.tsx
import BookingForm from '@/components/booking/BookingForm';
import { getCourts } from '@/lib/api';

export default async function ReservarPage() {
  const courts = await getCourts();

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Reservá tu Cancha
          </h1>
          <p className="text-lg text-gray-600">
            Elegí cancha, fecha y horario. Recibí confirmación al instante.
          </p>
        </header>

        <BookingForm courts={courts} />
      </div>
    </main>
  );
}