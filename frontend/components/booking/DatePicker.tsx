type Props = {
  value: string;
  onChange: (date: string) => void;
};

export default function DatePicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        📅 Fecha
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
      />
    </div>
  );
}