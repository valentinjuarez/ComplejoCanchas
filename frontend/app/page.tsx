import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <section className="relative overflow-hidden px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h1 className="mb-6 text-5xl font-bold leading-tight text-gray-900">
                Reservá tu Cancha
                <span className="block text-purple-600">Online</span>
              </h1>
              <p className="mb-8 text-xl text-gray-600">
                Elegí la cancha, el horario y reservá en segundos sin necesidad
                de crear una cuenta.
              </p>
              <Link
                href="/reservar"
                className="inline-block rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-purple-700"
              >
                Reservar Ahora →
              </Link>
            </div>

            <div className="relative">
              <div className="rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 p-8 shadow-2xl">
                <div className="space-y-4 rounded-2xl bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Cancha 1 · Fútbol 5
                    </span>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      ✓ Disponible
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    18:00 - 19:00
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    $6.000
                  </div>
                  <div className="w-full rounded-xl bg-purple-600 py-3 text-center font-semibold text-white">
                    Confirmar Reserva
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon="⚡"
              title="Simple y rápido"
              description="Reservá tu turno en menos de un minuto."
            />
            <FeatureCard
              icon="🔒"
              title="Sin crear cuenta"
              description="Reservá sin necesidad de registrarte."
            />
            <FeatureCard
              icon="📅"
              title="Todo bajo control"
              description="Evita dobles reservas y confusiones."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
                       icon,
                       title,
                       description,
                     }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md">
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}