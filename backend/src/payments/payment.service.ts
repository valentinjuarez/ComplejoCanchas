import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mpClient } from './mercadopago.client';
import crypto from 'crypto';

type WebhookInput = {
  notificationId: string; // puede ser paymentId o merchantOrderId (a veces viene como URL completa)
  topic: string; // 'payment' o 'merchant_order'
  raw: unknown;
  headers: { xSignature: string; xRequestId: string };
};

type MpPayment = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  order?: { id?: number | string | null } | null;
};

type MpMerchantOrder = {
  id: number | string;
  external_reference?: string | null;
  payments?: Array<{ id: number | string; status?: string | null }> | null;
};

type MpPreferenceResponse = {
  id: string | number;
  init_point: string;
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
  ) {}

  private get accessToken(): string {
    const token = this.cfg.get<string>('MP_ACCESS_TOKEN');
    if (!token) throw new BadRequestException('MP_ACCESS_TOKEN missing');
    return token;
  }

  /**
   * MP a veces manda notificationId como URL completa:
   * https://api.mercadolibre.com/merchant_orders/376...
   * Para:
   * - armar la URL bien
   * - y validar firma bien
   * necesitamos quedarnos con el último segmento numérico.
   */
  private normalizeNotificationId(idRaw: string): string {
    const s = String(idRaw ?? '').trim();
    if (!s) return s;

    // ya es numérico
    if (/^\d+$/.test(s)) return s;

    // intenta como URL
    try {
      const u = new URL(s);
      const parts = u.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1] ?? s;
      return /^\d+$/.test(last) ? last : last;
    } catch {
      // fallback: split simple
      const parts = s.split('/').filter(Boolean);
      const last = parts[parts.length - 1] ?? s;
      return last;
    }
  }

  // -----------------------------
  // WEBHOOK (idempotente)
  // -----------------------------
  async handleMercadoPagoWebhook(
    input: WebhookInput,
  ): Promise<{ ok: true; ignored?: true; idempotent?: true }> {
    const topic = String(input.topic || '').toLowerCase();
    const notificationId = this.normalizeNotificationId(input.notificationId);

    // Validar firma (si hay secret configurado) usando el id normalizado
    this.validateSignatureIfConfigured({
      ...input,
      notificationId,
      topic,
    });

    const client = mpClient(this.accessToken);
    let mpPayment: MpPayment | null = null;

    try {
      if (topic.includes('merchant_order')) {
        // 1) traer la merchant order
        const moResp = await client.get<MpMerchantOrder>(`/merchant_orders/${notificationId}`);
        const mo = moResp.data;

        const payments = mo.payments ?? [];
        if (payments.length === 0) return { ok: true, ignored: true };

        // 2) elegir el payment correcto:
        // - si hay uno approved, usarlo
        // - si no, usar el último intento
        const chosen =
          payments.find((p) => (p.status ?? '').toLowerCase() === 'approved') ??
          payments[payments.length - 1];

        if (!chosen?.id) return { ok: true, ignored: true };

        // 3) traer el pago real
        const payResp = await client.get<MpPayment>(`/v1/payments/${String(chosen.id)}`);
        mpPayment = payResp.data;
      } else {
        // evento payment
        const payResp = await client.get<MpPayment>(`/v1/payments/${notificationId}`);
        mpPayment = payResp.data;
      }
    } catch (err: any) {
      // Si MP devuelve 404 (pago/orden no encontrado) no rompas el webhook
      const status = err?.response?.status;
      if (status === 404) return { ok: true, ignored: true };
      throw err;
    }

    const reservationId = this.parseReservationId(mpPayment.external_reference);
    if (!reservationId) {
      throw new BadRequestException('external_reference inválida o faltante');
    }

    // En tu schema: Payment.reservationId ES unique
    const payment = await this.prisma.payment.findUnique({
      where: { reservationId },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        mpPaymentId: true,
        mpMerchantOrderId: true,
        reservationId: true,
      },
    });

    if (!payment) return { ok: true, ignored: true };

    const normalizedStatus = this.mapMpStatus(String(mpPayment.status));
    const mpPaymentId = String(mpPayment.id);

    // Idempotencia: ya procesado con mismo pago + mismo estado
    if (payment.mpPaymentId === mpPaymentId && payment.status === normalizedStatus) {
      return { ok: true, idempotent: true };
    }

    // Validación monto/moneda
    const mpAmount = Number(mpPayment.transaction_amount);
    if (!Number.isFinite(mpAmount)) {
      throw new BadRequestException('transaction_amount inválido');
    }

    const sameAmount = Math.abs(mpAmount - payment.amount) < 0.0001;
    const mpCurrency = String(mpPayment.currency_id ?? 'ARS');

    if (!sameAmount || mpCurrency !== payment.currency) {
      throw new BadRequestException('Monto o moneda no coincide');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1) update payment
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: normalizedStatus,
          mpPaymentId,
          mpMerchantOrderId: mpPayment.order?.id
            ? String(mpPayment.order.id)
            : payment.mpMerchantOrderId,
          rawWebhook: input.raw as Prisma.InputJsonValue,
        },
      });

      // 2) transición reserva
      const reserva = await tx.reserva.findUnique({
        where: { id: reservationId },
        select: { id: true, status: true, expiresAt: true },
      });

      if (!reserva) return;

      if (normalizedStatus === 'APPROVED') {
        /**
         * ✅ IMPORTANTÍSIMO:
         * si el pago se acreditó, NO queremos que quede EXPIRED aunque el hold haya vencido.
         * Activamos siempre que no esté cancelada.
         */
        if (reserva.status !== 'CANCELED') {
          await tx.reserva.update({
            where: { id: reservationId },
            data: { status: 'ACTIVE', expiresAt: null },
          });
        }
      } else if (normalizedStatus === 'REJECTED' || normalizedStatus === 'CANCELLED') {
        // Si estaba esperando pago, marcamos vencida
        if (reserva.status === 'PENDING_PAYMENT') {
          await tx.reserva.update({
            where: { id: reservationId },
            data: { status: 'EXPIRED' },
          });
        }
      }
    });

    return { ok: true };
  }

  private parseReservationId(externalReference?: string | null): number | null {
    if (!externalReference) return null;
    const n = Number.parseInt(String(externalReference), 10);
    if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) return null;
    return n;
  }

  private mapMpStatus(mpStatus: string): PaymentStatus {
    switch (mpStatus) {
      case 'approved':
        return 'APPROVED';
      case 'pending':
      case 'in_process':
        return 'PENDING';
      case 'rejected':
        return 'REJECTED';
      case 'cancelled':
        return 'CANCELLED';
      case 'refunded':
        return 'REFUNDED';
      case 'charged_back':
        return 'CHARGEDBACK';
      default:
        return 'PENDING';
    }
  }

  /**
   * Valida firma del webhook si configuraste MP_WEBHOOK_SECRET.
   * Si MP_WEBHOOK_SECRET está vacío => NO valida (dev).
   */
  private validateSignatureIfConfigured(input: WebhookInput): void {
    const secretRaw = this.cfg.get<string>('MP_WEBHOOK_SECRET');
    const secret = (secretRaw ?? '').trim();

    if (!secret) return;

    const signatureHeader = String(input.headers.xSignature ?? '').trim();
    const requestId = String(input.headers.xRequestId ?? '').trim();

    if (!signatureHeader || !requestId) {
      throw new UnauthorizedException('Missing MercadoPago signature headers');
    }

    const parts = signatureHeader.split(',').map((s) => s.trim());
    const ts = parts.find((p) => p.startsWith('ts='))?.slice(3);
    const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);

    if (!ts || !v1) {
      throw new UnauthorizedException('Invalid signature format');
    }

    // ⚠️ usar notificationId NORMALIZADO (id numérico), no URL completa
    const idForSignature = this.normalizeNotificationId(input.notificationId);

    const manifest = `id:${idForSignature};request-id:${requestId};ts:${ts};`;
    const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const ok =
      digest.length === v1.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(v1));

    if (!ok) {
      throw new UnauthorizedException('Invalid MercadoPago signature');
    }
  }

  // -----------------------------
  // PREFERENCE (para iniciar pago)
  // -----------------------------
  async createPreference(args: {
    reservationId: number;
    title: string;
    amount: number;
    expiresAt: Date;
    idempotencyKey: string;
  }): Promise<{ preferenceId: string; initPoint: string }> {
    const publicBase = this.cfg.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:3001';
    const apiBase = this.cfg.get<string>('API_BASE_URL') ?? 'http://localhost:3000';

    const client = mpClient(this.accessToken);

    const payload = {
      external_reference: String(args.reservationId),
      items: [
        {
          title: args.title,
          quantity: 1,
          unit_price: Number(args.amount),
          currency_id: 'ARS',
        },
      ],
      back_urls: {
        success: `${publicBase}/pago/success?rid=${args.reservationId}`,
        pending: `${publicBase}/pago/pending?rid=${args.reservationId}`,
        failure: `${publicBase}/pago/failure?rid=${args.reservationId}`,
      },

      auto_return: 'approved', // 👈 CLAVE

      notification_url: `${apiBase}/payments/mercadopago/webhook`,
      expires: true,
      expiration_date_to: args.expiresAt.toISOString(),
    };

    const resp = await client.post<MpPreferenceResponse>('/checkout/preferences', payload, {
      headers: { 'X-Idempotency-Key': args.idempotencyKey },
    });

    return {
      preferenceId: String(resp.data.id),
      initPoint: String(resp.data.init_point),
    };
  }
}
