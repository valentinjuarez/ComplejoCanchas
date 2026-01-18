import type { Court } from '@/lib/api';

type Props = {
  courts: Court[];
  value: number;
  onChange: (id: number) => void;
};

export default function CourtSelector({ courts, value, onChange }: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Cancha
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
      >
        {courts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.type}
          </option>
        ))}
      </select>
      {courts.length === 0 && (
        <p className="mt-2 text-sm text-red-600">
          No hay canchas activas disponibles.
        </p>
      )}
    </div>
  );
}