// app/admin/courts/page.tsx
export default function AdminCourtsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Canchas</h1>
      <p className="mt-2 text-slate-600">
        Acá vas a administrar canchas (crear/editar/activar/desactivar/precio/jugadores).
      </p>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-slate-700">
          ✅ Página lista. Cuando quieras, conectamos al backend para listar y editar canchas.
        </p>
      </div>
    </main>
  );
}
