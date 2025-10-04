import type { Request } from 'express';
import pino from 'pino';

import type { CourierAdapter, CreateJobRequest, CreateJobResponse, DeliveryUpdate, QuoteRequest, QuoteResponse } from '..';

const logger = pino({ name: 'dispatch-adapter' });

export class DispatchAdapter implements CourierAdapter {
  constructor(private readonly apiKey: string, private readonly baseUrl: string) {}

  async quote(req: QuoteRequest): Promise<QuoteResponse> {
    logger.info({ req }, 'requesting Dispatch quote');
    // Placeholder request — real implementation would call Dispatch API.
    return { fee: 20, currency: 'USD', etaMinutes: 45 };
  }

  async create(job: CreateJobRequest): Promise<CreateJobResponse> {
    logger.info({ job }, 'creating Dispatch delivery');
    return { externalJobId: `dispatch_${Date.now()}`, trackingUrl: 'https://dispatch.local/tracking/demo' };
  }

  async cancel(externalJobId: string): Promise<void> {
    logger.info({ externalJobId }, 'cancel Dispatch job');
  }

  parseWebhook(req: Request): DeliveryUpdate {
    const payload = req.body as Record<string, any>;
    logger.info({ payload }, 'received Dispatch webhook');
    return {
      status: payload.status ?? 'unknown',
      timestamps: payload.timestamps ?? {},
      proof: payload.proof
    };
  }
}
