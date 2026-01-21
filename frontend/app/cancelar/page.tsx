// app/cancelar/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { getReservationByToken, cancelReservation } from '@/lib/api';
import type {
  ReservationByTokenResponse,
  CancelReservationResponse,
} from '@/lib/api';

function CancelPageContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [token, setToken] = useState(tokenFromUrl || '');
  const [reservation, setReservation] =
    useState<ReservationByTokenResponse | null>(null);
  const [cancelled, setCancelled] =
    useState<CancelReservationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenFromUrl) {
      void loadReservation(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  async function loadReservation(t: string) {
    if (!t || t.length < 10) {
      setError('Token inválido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getReservationByToken(t);
      setReservation(data);
      setCancelled(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar la reserva';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!token) return;

    const confirmed = window.confirm(
      '¿Estás seguro que querés cancelar esta reserva?',
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);
      const result = await cancelReservation(token);
      setCancelled(result);
      setReservation(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cancelar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Mostrar éxito de cancelación
  if (cancelled) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-20">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-y-1/2 rounded-full bg-orange-200/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 translate-y-1/2 rounded-full bg-red-200/20 blur-3xl" />

        <div className="relative mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative bg-gradient-to-r from-orange-600 to-red-600 p-8 text-center text-white">
              <div className="absolute left-0 top-0 h-full w-full bg-[url('/grid.svg')] opacity-10" />
              <div className="relative">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <span className="text-6xl">🗑️</span>
                </div>
                <h2 className="mb-2 text-4xl font-bold">Reserva Cancelada</h2>
                <p className="text-lg text-orange-100">{cancelled.message}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                {cancelled.refundApplied ? (
                  <div className="animate-fade-in rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-green-500 p-3 text-white">
                        <span className="text-3xl">💰</span>
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 text-xl font-bold text-green-900">
                          Reembolso Aplicado
                        </div>
                        <div className="text-green-700">
                          Se te devolverán{' '}
                          <span className="font-bold">
                            $
                            {cancelled.reservation.depositAmount.toLocaleString(
                              'es-AR',
                            )}
                          </span>{' '}
                          en 5-7 días hábiles
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-fade-in rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-orange-500 p-3 text-white">
                        <span className="text-3xl">⚠️</span>
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 text-xl font-bold text-orange-900">
                          Sin Reembolso
                        </div>
                        <div className="text-orange-700">
                          Cancelaste con menos de 3 horas de anticipación
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6">
                  <div className="mb-4 text-lg font-semibold text-gray-900">
                    📋 Detalles de la Reserva
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-white p-3">
                      <span className="text-gray-600">ID de Reserva</span>
                      <span className="font-bold text-purple-600">
                        #{cancelled.reservation.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white p-3">
                      <span className="text-gray-600">Cancha</span>
                      <span className="font-semibold">
                        {cancelled.reservation.court.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white p-3">
                      <span className="text-gray-600">Seña Pagada</span>
                      <span className="font-bold text-gray-900">
                        $
                        {cancelled.reservation.depositAmount.toLocaleString(
                          'es-AR',
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white p-3">
                      <span className="text-gray-600">Cancelada el</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/reservar"
                  className="block w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-center font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700"
                >
                  Hacer otra reserva
                </Link>
                <Link
                  href="/"
                  className="block w-full rounded-xl border-2 border-purple-600 px-6 py-4 text-center font-semibold text-purple-600 transition hover:bg-purple-50"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Formulario para ingresar token o mostrar detalles
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-20">
      <div className="absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-purple-600 transition hover:text-purple-700"
        >
          ← Volver al inicio
        </Link>

        <div className="mb-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-purple-100 p-4">
            <span className="text-5xl">🔑</span>
          </div>
          <h1 className="mb-3 text-5xl font-bold text-gray-900">
            Cancelar Reserva
          </h1>
          <p className="text-lg text-gray-600">
            Ingresá tu token de cancelación para continuar
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white">
            <div className="absolute left-0 top-0 h-full w-full bg-[url('/grid.svg')] opacity-10" />
            <div className="relative">
              <h2 className="mb-2 text-3xl font-bold">Token de Cancelación</h2>
              <p className="text-purple-100">
                Lo recibiste en el email de confirmación
              </p>
            </div>
          </div>

          <div className="p-8">
            {!reservation && (
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-700">
                    🔑 Ingresá tu Token
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="550e8400-e29b-41d4-a716-446655440000"
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-4 font-mono text-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Copiá y pegá el token desde tu email
                  </p>
                </div>

                {error && (
                  <div className="animate-shake rounded-xl border-2 border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <div className="font-semibold text-red-900">Error</div>
                        <div className="text-sm text-red-700">{error}</div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => void loadReservation(token)}
                  disabled={loading || !token}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Buscando...
                    </span>
                  ) : (
                    '🔍 Buscar Reserva'
                  )}
                </button>

                <Link
                  href="/"
                  className="block w-full rounded-xl border-2 border-purple-600 px-6 py-4 text-center font-semibold text-purple-600 transition hover:bg-purple-50"
                >
                  Cancelar
                </Link>
              </div>
            )}

            {reservation && (
              <div className="space-y-6">
                <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6">
                  <h3 className="mb-5 text-xl font-bold text-purple-900">
                    📋 Detalles de tu Reserva
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                      <span className="text-gray-600">Número</span>
                      <span className="text-2xl font-bold text-purple-600">
                        #{reservation.reservation.id}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                      <span className="text-gray-600">Cancha</span>
                      <span className="font-semibold">
                        {reservation.reservation.court.name}
                      </span>
                    </div>

                    <div className="rounded-xl bg-white p-4 shadow-sm">
                      <div className="mb-2 text-sm text-gray-600">
                        Fecha y Horario
                      </div>
                      <div className="font-semibold">
                        {reservation.reservation.startTime}
                      </div>
                      <div className="text-sm text-gray-500">
                        hasta {reservation.reservation.endTime}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                      <span className="text-gray-600">Usuario</span>
                      <span className="font-medium">
                        {reservation.reservation.user.name}
                      </span>
                    </div>

                    <div className="rounded-xl border-2 border-purple-300 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-gray-600">Total</span>
                        <span className="text-3xl font-bold text-purple-600">
                          $
                          {reservation.reservation.price.toLocaleString(
                            'es-AR',
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-sm text-gray-600">Seña</span>
                        <span className="font-bold text-gray-900">
                          $
                          {reservation.reservation.depositAmount.toLocaleString(
                            'es-AR',
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {reservation.canCancel && (
                  <div
                    className={`rounded-2xl border-2 p-6 ${
                      reservation.refundEligible
                        ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
                        : 'border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`rounded-full p-3 ${
                          reservation.refundEligible
                            ? 'bg-green-500'
                            : 'bg-orange-500'
                        }`}
                      >
                        <span className="text-3xl text-white">
                          {reservation.refundEligible ? '✅' : '⚠️'}
                        </span>
                      </div>
                      <div>
                        <div
                          className={`mb-2 text-xl font-bold ${
                            reservation.refundEligible
                              ? 'text-green-900'
                              : 'text-orange-900'
                          }`}
                        >
                          {reservation.refundEligible
                            ? '💰 Con Reembolso'
                            : '⚠️ Sin Reembolso'}
                        </div>
                        <div
                          className={`text-sm ${
                            reservation.refundEligible
                              ? 'text-green-700'
                              : 'text-orange-700'
                          }`}
                        >
                          {reservation.refundEligible
                            ? `Se te devolverá la seña de $${reservation.reservation.depositAmount.toLocaleString(
                              'es-AR',
                            )} (${reservation.hoursUntilReservation.toFixed(
                              1,
                            )}h de anticipación)`
                            : `Cancelás con ${reservation.hoursUntilReservation.toFixed(
                              1,
                            )}h de anticipación (menos de 3hs)`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!reservation.canCancel && (
                  <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-red-500 p-3">
                        <span className="text-3xl text-white">🚫</span>
                      </div>
                      <div>
                        <div className="mb-1 text-xl font-bold text-red-900">
                          No se Puede Cancelar
                        </div>
                        <div className="text-sm text-red-700">
                          {reservation.reservation.status === 'CANCELED'
                            ? 'Esta reserva ya fue cancelada anteriormente'
                            : 'El turno ya pasó y no puede ser cancelado'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <div className="font-semibold text-red-900">Error</div>
                        <div className="text-sm text-red-700">{error}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {reservation.canCancel && (
                    <button
                      onClick={() => void handleCancel()}
                      disabled={loading}
                      className="w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-red-700 hover:to-rose-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Cancelando...
                        </span>
                      ) : (
                        '🗑️ Confirmar Cancelación'
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setReservation(null);
                      setToken('');
                      setError(null);
                    }}
                    className="w-full rounded-xl border-2 border-gray-300 px-6 py-4 font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    ← Volver
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            <div className="text-gray-600">Cargando...</div>
          </div>
        </div>
      }
    >
      <CancelPageContent />
    </Suspense>
  );
}