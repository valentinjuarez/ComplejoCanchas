"use client";

import { useRouter } from "next/navigation";

export default function PagoPendingClient({ rid }: { rid?: string }) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Pago pendiente</h1>
        <p className="mt-2 text-gray-600">
          MercadoPago dejó el pago en estado pendiente. Si se acredita, te vamos a confirmar.
        </p>

        {rid && (
          <p className="mt-2 text-sm text-gray-500">
            Reserva: <strong>#{rid}</strong>
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/pago/success?rid=${rid ?? ""}`)}
            className="rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
          >
            Verificar estado
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold text-white"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
