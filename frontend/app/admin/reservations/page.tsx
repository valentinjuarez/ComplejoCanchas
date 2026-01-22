// app/admin/reservations/page.tsx
export default function AdminReservationsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Reservas</h1>
      <p className="mt-2 text-slate-600">
        Acá vas a ver y gestionar reservas (estado, fecha, cancha, usuario, seña, etc.).
      </p>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-slate-700">
          ✅ Página lista. Cuando quieras, conectamos al backend y armamos la tabla + filtros.
        </p>
      </div>
    </main>
  );
}
