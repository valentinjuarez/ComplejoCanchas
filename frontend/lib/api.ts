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
};

export type CreateReservationPayload = {
  name: string;
  email: string;
  courtId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
};

export type ReservationPublicResponse = {
  id: number;
  status: 'ACTIVE' | 'CANCELED';
  price: number;
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