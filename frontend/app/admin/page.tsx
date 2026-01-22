// app/admin/page.tsx
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Bienvenido al panel. Elegí una sección para administrar.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/admin/reservations"
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
        >
          <div className="text-3xl">📅</div>
          <div className="mt-3 text-xl font-semibold text-slate-900">Reservas</div>
          <p className="mt-2 text-slate-600">
            Ver reservas activas/canceladas, filtrar por fecha y cancha.
          </p>
        </Link>

        <Link
          href="/admin/courts"
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
        >
          <div className="text-3xl">🏟️</div>
          <div className="mt-3 text-xl font-semibold text-slate-900">Canchas</div>
          <p className="mt-2 text-slate-600">
            Administrar canchas, precios, disponibilidad y configuración.
          </p>
        </Link>
      </div>
    </main>
  );
}
