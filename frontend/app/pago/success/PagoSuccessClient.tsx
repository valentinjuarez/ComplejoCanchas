"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BookingSuccess from "@/components/booking/BookingSuccess";
import { getReservationById } from "@/lib/api";
import type { ReservationPublicResponse } from "@/lib/api";

function toSingle(param: string | null): string | null {
  if (!param) return null;
  const t = param.trim();
  return t.length ? t : null;
}

function parsePositiveInt(s: string | null): number | null {
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) return null;
  return n;
}

export default function PagoSuccessClient() {
  const router = useRouter();
  const sp = useSearchParams();

  // MercadoPago suele devolver: rid, external_reference, payment_id, collection_id, status, etc.
  const ridParam = toSingle(sp.get("rid"));
  const externalRefParam = toSingle(sp.get("external_reference"));
  const statusParam = toSingle(sp.get("status")) || toSingle(sp.get("collection_status"));
  const paymentIdParam = toSingle(sp.get("payment_id")) || toSingle(sp.get("collection_id"));

  // ✅ si falta rid, usamos external_reference (MP lo manda)
  const ridNum = useMemo(() => {
    const fromRid = parsePositiveInt(ridParam);
    if (fromRid) return fromRid;
    const fromExt = parsePositiveInt(externalRefParam);
    if (fromExt) return fromExt;
    return null;
  }, [ridParam, externalRefParam]);

  const [reservation, setReservation] = useState<ReservationPublicResponse | null>(null);
  const [status, setStatus] = useState<string>("Cargando…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ridNum) {
      setError("Falta rid en la URL.");
      return;
    }

    const id = ridNum; // ✅ ahora TS sabe que es number

    let cancelled = false;

    async function poll() {
      setError(null);
      setStatus("Confirmando pago…");

      const maxAttempts = 24;
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;

        try {
          const r = await getReservationById(id); // ✅ id es number

          if (r.status === "ACTIVE") {
            setReservation(r);
            return;
          }

          if (r.status === "PENDING_PAYMENT") {
            setStatus("Pago recibido. Esperando confirmación…");
          } else if (r.status === "EXPIRED") {
            setError("La reserva expiró antes de confirmarse el pago.");
            return;
          } else if (r.status === "CANCELED") {
            setError("La reserva fue cancelada.");
            return;
          } else {
            setStatus("Procesando…");
          }
        } catch {
          setStatus("Reintentando…");
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      setError("No pudimos confirmar el pago todavía. Reintentá en unos segundos.");
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [ridNum]);
  if (reservation) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <BookingSuccess
          reservation={reservation}
          onBookAnother={() => router.push("/reservar")}
          onGoHome={() => router.push("/")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Procesando…</h1>
        <p className="mt-2 text-gray-600">{status}</p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <strong>❌</strong> {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
          >
            Reintentar
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold text-white"
          >
            Volver al Home
          </button>
        </div>
      </div>
    </div>
  );
}
