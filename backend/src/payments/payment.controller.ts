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
  // si ya es un id "123" lo devuelve igual
  if (/^\d+$/.test(urlOrId)) return urlOrId;

  // intenta parsear como URL y tomar el último segmento
  try {
    const u = new URL(urlOrId);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? urlOrId;
  } catch {
    // fallback: si viene tipo ".../37614797371"
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

    // topic puede venir como "type" o "topic"
    const topic = (pickTopic(body) ?? pickTopic(query) ?? 'payment').toLowerCase();

    let notificationId: string | null = null;

    if (topic.includes('merchant_order')) {
      // MP suele mandar ?id=...&topic=merchant_order
      notificationId = normalizeId(query?.id);

      // fallback: si vino en body.resource como URL
      if (!notificationId && isRecord(body) && typeof body['resource'] === 'string') {
        notificationId = extractLastPathSegment(body['resource']);
      }
    } else {
      // payment: puede venir como ?id=.. o ?data.id=.. o en body.data.id
      notificationId =
        normalizeId(query?.id) ??
        normalizeId(query?.['data.id']) ??
        (isRecord(body) && isRecord(body['data']) ? normalizeId(body['data']['id']) : null) ??
        (isRecord(body) ? normalizeId(body['id']) : null);
    }

    if (!notificationId) throw new BadRequestException('id missing');
    notificationId = extractLastPathSegment(notificationId);

    return this.payments.handleMercadoPagoWebhook({
      notificationId,
      topic,
      raw: body,
      headers: {
        xSignature: xSignature ?? '',
        xRequestId: xRequestId ?? '',
      },
    });
  }
}
