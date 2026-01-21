// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Decorative Background */}
      <div className="absolute left-0 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-blue-300/20 blur-3xl" />

      {/* Hero Section */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Content */}
            <div className="relative z-10">
              <div className="mb-6 inline-block rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-600">
                🎉 Sistema de reservas online
              </div>
              <h1 className="mb-6 text-6xl font-bold leading-tight text-gray-900">
                Reservá tu Cancha
                <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Online
                </span>
              </h1>
              <p className="mb-8 text-xl leading-relaxed text-gray-600">
                Elegí la cancha, el horario y reservá en segundos.{' '}
                <span className="font-semibold text-purple-600">
                  Sin necesidad de crear cuenta.
                </span>
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/reservar"
                  className="inline-block rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
                >
                  Reservar Ahora →
                </Link>
                <Link
                  href="/cancelar"
                  className="inline-block rounded-xl border-2 border-purple-600 px-8 py-4 text-lg font-semibold text-purple-600 transition hover:bg-purple-50"
                >
                  Cancelar Reserva
                </Link>
              </div>
            </div>

            {/* Right - Pasos del Proceso */}
            <div className="relative z-10">
              <div className="space-y-6">
                <ProcessStep
                  number="1"
                  title="Elegí tu cancha"
                  description="Cancha 1, 2 o 3"
                  color="purple"
                />
                <ProcessStep
                  number="2"
                  title="Seleccioná fecha y hora"
                  description="Mirá disponibilidad en tiempo real"
                  color="blue"
                />
                <ProcessStep
                  number="3"
                  title="Confirmá tu reserva"
                  description="Recibí un email al instante"
                  color="green"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-lg text-gray-600">
              La forma más fácil y rápida de reservar tu cancha
            </p>
          </div>
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

      {/* CTA Section */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 p-12 text-center shadow-2xl">
            <div className="mb-6 text-6xl">🥅</div>
            <h2 className="mb-4 text-4xl font-bold text-white">
              ¿Listo para reservar?
            </h2>
            <p className="mb-8 text-xl text-purple-100">
              Hacé tu reserva ahora y asegurá tu turno
            </p>
            <Link
              href="/reservar"
              className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-purple-600 shadow-lg transition hover:scale-105"
            >
              Reservar mi cancha →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProcessStep({
                       number,
                       title,
                       description,
                       color,
                     }: {
  number: string;
  title: string;
  description: string;
  color: 'purple' | 'blue' | 'green';
}) {
  const colors = {
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
  };

  return (
    <div className="group flex gap-4 rounded-2xl bg-white p-6 shadow-lg transition hover:scale-105 hover:shadow-2xl">
      <div
        className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors[color]} text-2xl font-bold text-white shadow-md transition group-hover:scale-110`}
      >
        {number}
      </div>
      <div>
        <h3 className="mb-1 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
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
    <div className="group rounded-2xl bg-white p-8 shadow-lg transition hover:scale-105 hover:shadow-2xl">
      <div className="mb-4 text-6xl transition group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
