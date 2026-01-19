// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <section className="relative overflow-hidden px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Content */}
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

            {/* Right - Pasos del Proceso */}
            <div className="relative">
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
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            ¿Por qué elegirnos?
          </h2>
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

// Componente para cada paso del proceso
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
    <div className="flex gap-4 rounded-2xl bg-white p-6 shadow-lg transition hover:scale-105 hover:shadow-xl">
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors[color]} text-2xl font-bold text-white shadow-md`}
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

// Componente para las características
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