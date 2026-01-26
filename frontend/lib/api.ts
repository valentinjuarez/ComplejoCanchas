export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ---------- Types ----------
export type OccupiedSlot = {
  startTime: string;
  endTime: string;
  reservedBy: string;
};

export type AvailabilityResponse = {
  court: {
    id: number;
    name: string;
    pricePerHour: number;
    playersCount: number;
    depositPerPlayer: number;
  };
  date: string;
  occupiedSlots: OccupiedSlot[];
  totalReservations: number;
};

export type Court = {
  id: number;
  name: string;
  type: string;
  active: boolean;
  pricePerHour: number;
  playersCount: number;
};

export type CreateReservationPayload = {
  name: string;
  email: string;
  courtId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
};

export type ReservationStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELED';

export type ReservationPublicResponse = {
  id: number;
  status: ReservationStatus;
  price: number;
  depositAmount: number;
  refunded?: boolean;
  cancelToken?: string | null;
  canceledAt?: string | null;
  startTime: string; // ISO
  endTime: string; // ISO
  createdAt: string; // ISO
  court: { id: number; name: string; active: boolean };
  user: { id: number; name: string; email: string };
};

export type CancelReservationResponse = {
  reservation: ReservationPublicResponse;
  refundApplied: boolean;
  message: string;
  hoursUntilReservation: number;
};

export type ReservationByTokenResponse = {
  reservation: {
    id: number;
    status: 'ACTIVE' | 'CANCELED';
    price: number;
    depositAmount: number;
    refunded: boolean;
    canceledAt: string | null;
    startTime: string;
    endTime: string;
    court: { id: number; name: string };
    user: { name: string; email: string };
  };
  canCancel: boolean;
  refundEligible: boolean;
  hoursUntilReservation: number;
};

// ✅ NUEVO: response del HOLD
export type HoldCheckoutResponse = {
  reservationId: number;
  status: ReservationStatus; // normalmente PENDING_PAYMENT
  expiresAt: string; // ISO
  depositAmount: number;
  playersCount: number;
  checkoutUrl: string;
};

// ---------- Helpers ----------
async function handleJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// ---------- API ----------
export async function getReservationByToken(
  token: string,
): Promise<ReservationByTokenResponse> {
  const res = await fetch(`${API_URL}/reservations/by-token/${token}`, {
    cache: 'no-store',
  });
  return handleJson<ReservationByTokenResponse>(res);
}

export async function getCourts(): Promise<Court[]> {
  const res = await fetch(`${API_URL}/courts`, { cache: 'no-store' });
  return handleJson<Court[]>(res);
}

export async function getAvailability(
  courtId: number,
  date: string,
): Promise<AvailabilityResponse> {
  const res = await fetch(
    `${API_URL}/courts/${courtId}/availability?date=${encodeURIComponent(date)}`,
    { cache: 'no-store' },
  );
  return handleJson<AvailabilityResponse>(res);
}

export async function createReservation(
  payload: CreateReservationPayload,
): Promise<ReservationPublicResponse> {
  const res = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<ReservationPublicResponse>(res);
}

export async function cancelReservation(
  token: string,
): Promise<CancelReservationResponse> {
  const res = await fetch(`${API_URL}/reservations/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return handleJson<CancelReservationResponse>(res);
}

// ✅ NUEVO: crear hold + devolver checkoutUrl
export async function createHoldReservation(
  payload: CreateReservationPayload,
): Promise<HoldCheckoutResponse> {
  const res = await fetch(`${API_URL}/reservations/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<HoldCheckoutResponse>(res);
}

// ✅ NUEVO: obtener reserva por id (polling en success)
export async function getReservationById(
  id: number,
): Promise<ReservationPublicResponse> {
  const res = await fetch(`${API_URL}/reservations/${id}`, { cache: 'no-store' });
  return handleJson<ReservationPublicResponse>(res);
}
