import { Controller, Post, Req, Headers, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Request } from 'express';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function normalizeId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
}

function extractLastPathSegment(urlOrId: string): string {
  if (/^\d+$/.test(urlOrId)) return urlOrId;

  try {
    const u = new URL(urlOrId);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? urlOrId;
  } catch {
    const parts = urlOrId.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? urlOrId;
  }
}

function pickTopic(obj: unknown): string | null {
  if (!isRecord(obj)) return null;
  const t = obj['type'] ?? obj['topic'];
  if (typeof t === 'string' && t.trim()) return t.trim();
  return null;
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post('mercadopago/webhook')
  async mpWebhook(
    @Req() req: Request,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const body: unknown = req.body;
    const query: any = req.query;

    // ✅ logs para ver si llega MP
    console.log('[MP WEBHOOK] hit', {
      query,
      body,
      xSignature: xSignature ?? null,
      xRequestId: xRequestId ?? null,
    });

    const topic = (pickTopic(body) ?? pickTopic(query) ?? 'payment').toLowerCase();

    let notificationId: string | null = null;

    // ✅ FIX: cuando MP manda data[id] (query.data.id), express lo parsea como objeto
    const queryDataId =
      typeof query?.data === 'object' && query?.data ? (query.data as any).id : undefined;

    if (topic.includes('merchant_order')) {
      // MP suele mandar ?id=...&topic=merchant_order
      notificationId = normalizeId(query?.id);

      // fallback: si vino en body.resource como URL
      if (!notificationId && isRecord(body) && typeof body['resource'] === 'string') {
        notificationId = extractLastPathSegment(body['resource']);
      }
    } else {
      // payment: puede venir como ?id=.. o ?data[id]=.. o en body.data.id
      notificationId =
        normalizeId(query?.id) ??
        normalizeId(queryDataId) ??
        (isRecord(body) && isRecord(body['data']) ? normalizeId(body['data']['id']) : null) ??
        (isRecord(body) ? normalizeId(body['id']) : null);
    }

    if (!notificationId) {
      console.error('[MP WEBHOOK] id missing', { topic, query, body });
      throw new BadRequestException('id missing');
    }

    notificationId = extractLastPathSegment(notificationId);

    console.log('[MP WEBHOOK] parsed', { topic, notificationId });

    // ✅ responder 200 rápido y procesar async (MP no timeoutea)
    this.payments
      .handleMercadoPagoWebhook({
        notificationId,
        topic,
        raw: body,
        headers: {
          xSignature: xSignature ?? '',
          xRequestId: xRequestId ?? '',
        },
      })
      .then((r) => console.log('[MP WEBHOOK] processed', r))
      .catch((e) => console.error('[MP WEBHOOK] process error', e));

    return { ok: true };
  }
}
