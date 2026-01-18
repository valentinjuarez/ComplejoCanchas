const SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type Props = {
  occupied: string[];
  loading: boolean;
  value: string;
  onChange: (time: string) => void;
};

export default function TimeSlotPicker({ occupied, loading, value, onChange }: Props) {
  const available = SLOTS.filter((s) => !occupied.includes(s));

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        🕐 Horario (1 hora)
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-50"
      >
        {available.map((slot) => (
          <option key={slot} value={slot}>
            {slot} - {addOneHour(slot)}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">
        {loading ? 'Cargando disponibilidad…' : `${available.length} horarios disponibles`}
      </p>
    </div>
  );
}