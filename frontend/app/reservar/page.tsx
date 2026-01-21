// app/reservar/page.tsx
import BookingForm from '@/components/booking/BookingForm';
import { getCourts } from '@/lib/api';


export default async function ReservarPage() {
  const courts = await getCourts();

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Decorative Background Elements */}
      <div className="absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-purple-100 p-4">
            <span className="text-5xl">⚽</span>
          </div>
          <h1 className="mb-3 text-5xl font-bold text-gray-900">
            Reservá tu Cancha
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Elegí cancha, fecha y horario.{' '}
            <span className="font-semibold text-purple-600">
              Recibí confirmación al instante.
            </span>
          </p>

          {/* Info Cards */}
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
              <span className="text-xl">⚡</span>
              <span className="text-sm font-medium text-gray-700">
                Reserva en 30 seg
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
              <span className="text-xl">🔒</span>
              <span className="text-sm font-medium text-gray-700">
                Sin crear cuenta
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
              <span className="text-xl">💳</span>
              <span className="text-sm font-medium text-gray-700">
                Pago online seguro
              </span>
            </div>
          </div>
        </header>

        <BookingForm courts={courts} />

        {/* Help Section */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-purple-100 to-blue-100 p-8 text-center">
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            ¿Necesitás ayuda?
          </h3>
          <p className="mb-4 text-gray-700">
            Si tenés alguna duda sobre cómo reservar, contactanos
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:info@reservatucancha.com"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-purple-600 shadow-sm transition hover:shadow-md"
            >
              📧 Email
            </a>

            <a
              href="https://wa.me/5491123456789"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-green-600"
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
