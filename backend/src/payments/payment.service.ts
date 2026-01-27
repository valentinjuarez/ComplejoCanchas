import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mpClient } from './mercadopago.client';
import crypto from 'crypto';

type WebhookInput = {
  notificationId: string;
  topic: string;
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

  // ---------- Helpers de dinero ----------
  private toCents(value: unknown): number | null {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return null;
    // redondeo a centavos (evita 166.666666)
    return Math.round(n * 100);
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private normalizeNotificationId(idRaw: string): string {
    const s = String(idRaw ?? '').trim();
    if (!s) return s;
    if (/^\d+$/.test(s)) return s;

    try {
      const u = new URL(s);
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] ?? s;
    } catch {
      const parts = s.split('/').filter(Boolean);
      return parts[parts.length - 1] ?? s;
    }
  }

  async handleMercadoPagoWebhook(
    input: WebhookInput,
  ): Promise<{ ok: true; ignored?: true; idempotent?: true }> {
    const topic = String(input.topic || '').toLowerCase();
    const notificationId = this.normalizeNotificationId(input.notificationId);

    console.log('[MP] handle webhook', { topic, notificationId });

    this.validateSignatureIfConfigured({
      ...input,
      notificationId,
      topic,
    });

    const client = mpClient(this.accessToken);

    let mpPayment: MpPayment | null = null;

    try {
      if (topic.includes('merchant_order')) {
        console.log('[MP] fetching merchant_order', notificationId);
        const moResp = await client.get<MpMerchantOrder>(`/merchant_orders/${notificationId}`);
        const mo = moResp.data;

        const payments = mo.payments ?? [];
        console.log('[MP] merchant_order payments len', payments.length);

        if (payments.length === 0) {
          // Esto es normal: a veces llega merchant_order vacío y después llega payment.
          return { ok: true, ignored: true };
        }

        const chosen =
          payments.find((p) => (p.status ?? '').toLowerCase() === 'approved') ??
          payments[payments.length - 1];

        if (!chosen?.id) return { ok: true, ignored: true };

        console.log('[MP] chosen payment from merchant_order', {
          chosenId: String(chosen.id),
          chosenStatus: chosen.status,
        });

        const payResp = await client.get<MpPayment>(`/v1/payments/${String(chosen.id)}`);
        mpPayment = payResp.data;
      } else {
        console.log('[MP] fetching payment', notificationId);
        const payResp = await client.get<MpPayment>(`/v1/payments/${notificationId}`);
        mpPayment = payResp.data;
      }
    } catch (err: any) {
      const status = err?.response?.status;
      console.log('[MP] fetch error', { status, message: err?.message });
      if (status === 404) return { ok: true, ignored: true };
      throw err;
    }

    if (!mpPayment) return { ok: true, ignored: true };

    console.log('[MP] payment fetched', {
      id: String(mpPayment.id),
      status: mpPayment.status,
      external_reference: mpPayment.external_reference,
      transaction_amount: mpPayment.transaction_amount,
      currency_id: mpPayment.currency_id,
      orderId: mpPayment.order?.id ? String(mpPayment.order.id) : null,
    });

    const reservationId = this.parseReservationId(mpPayment.external_reference);
    if (!reservationId) {
      console.log('[MP] invalid external_reference', mpPayment.external_reference);
      // No tires error duro (MP reintenta); ignoralo.
      return { ok: true, ignored: true };
    }

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

    if (!payment) {
      console.log('[MP] payment row not found for reservation', reservationId);
      return { ok: true, ignored: true };
    }

    const normalizedStatus = this.mapMpStatus(String(mpPayment.status));
    const mpPaymentId = String(mpPayment.id);

    // Idempotencia
    if (payment.mpPaymentId === mpPaymentId && payment.status === normalizedStatus) {
      console.log('[MP] idempotent - already processed', { reservationId, mpPaymentId });
      return { ok: true, idempotent: true };
    }

    // ✅ Comparación por CENTAVOS para evitar 166.666666 vs 166.67
    const mpCents = this.toCents(mpPayment.transaction_amount);
    const dbCents = this.toCents(payment.amount);

    const mpCurrency = String(mpPayment.currency_id ?? 'ARS');
    const dbCurrency = String(payment.currency ?? 'ARS');

    if (mpCents == null || dbCents == null) {
      console.log('[MP] invalid amounts', { mp: mpPayment.transaction_amount, db: payment.amount });
      return { ok: true, ignored: true };
    }

    if (mpCurrency !== dbCurrency || mpCents !== dbCents) {
      console.log('[MP] amount/currency mismatch', {
        mpAmount: this.round2(mpCents / 100),
        dbAmount: this.round2(dbCents / 100),
        mpCurrency,
        dbCurrency,
        reservationId,
      });

      // IMPORTANTÍSIMO: no tires 400 (MP reintenta y te spamea)
      return { ok: true, ignored: true };
    }

    await this.prisma.$transaction(async (tx) => {
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

      const reserva = await tx.reserva.findUnique({
        where: { id: reservationId },
        select: { id: true, status: true, expiresAt: true },
      });

      if (!reserva) return;

      if (normalizedStatus === 'APPROVED') {
        if (reserva.status !== 'CANCELED') {
          await tx.reserva.update({
            where: { id: reservationId },
            data: { status: 'ACTIVE', expiresAt: null },
          });
          console.log('[MP] reserva set ACTIVE', { reservationId });
        }
      } else if (normalizedStatus === 'REJECTED' || normalizedStatus === 'CANCELLED') {
        if (reserva.status === 'PENDING_PAYMENT') {
          await tx.reserva.update({
            where: { id: reservationId },
            data: { status: 'EXPIRED' },
          });
          console.log('[MP] reserva set EXPIRED', { reservationId });
        }
      } else {
        console.log('[MP] payment status not final', { normalizedStatus, reservationId });
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

  private validateSignatureIfConfigured(input: WebhookInput): void {
    const secretRaw = this.cfg.get<string>('MP_WEBHOOK_SECRET');
    const secret = (secretRaw ?? '').trim();

    if (!secret) {
      console.log('[MP] signature validation skipped (MP_WEBHOOK_SECRET empty)');
      return;
    }

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

    const idForSignature = this.normalizeNotificationId(input.notificationId);
    const manifest = `id:${idForSignature};request-id:${requestId};ts:${ts};`;
    const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const ok =
      digest.length === v1.length &&
      crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(v1));

    if (!ok) throw new UnauthorizedException('Invalid MercadoPago signature');

    console.log('[MP] signature OK');
  }

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

    // ✅ IMPORTANTE: unit_price SIEMPRE con 2 decimales (MP trabaja así)
    const unitPrice = this.round2(Number(args.amount));

    const payload = {
      external_reference: String(args.reservationId),
      items: [
        {
          title: args.title,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'ARS',
        },
      ],
      back_urls: {
        success: `${publicBase}/pago/success?rid=${args.reservationId}`,
        pending: `${publicBase}/pago/pending?rid=${args.reservationId}`,
        failure: `${publicBase}/pago/failure?rid=${args.reservationId}`,
      },
      auto_return: 'approved',
      notification_url: `${apiBase}/payments/mercadopago/webhook`,
      expires: true,
      expiration_date_to: args.expiresAt.toISOString(),
    };

    console.log('[MP] createPreference', {
      reservationId: args.reservationId,
      unitPrice,
      notification_url: payload.notification_url,
      success: payload.back_urls.success,
    });

    const resp = await client.post<MpPreferenceResponse>('/checkout/preferences', payload, {
      headers: { 'X-Idempotency-Key': args.idempotencyKey },
    });

    console.log('[MP] preference created', { id: String(resp.data.id) });

    return {
      preferenceId: String(resp.data.id),
      initPoint: String(resp.data.init_point),
    };
  }
}
