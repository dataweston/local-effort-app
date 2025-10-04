import type { Request } from 'express';
import pino from 'pino';

import type { CourierAdapter, CreateJobRequest, CreateJobResponse, DeliveryUpdate, QuoteRequest, QuoteResponse } from '..';

const logger = pino({ name: 'olo-adapter' });

export class OloAdapter implements CourierAdapter {
  async quote(req: QuoteRequest): Promise<QuoteResponse> {
    logger.info({ req }, 'returning stub Olo quote');
    return { fee: 0, currency: 'USD', etaMinutes: 0 };
  }

  async create(job: CreateJobRequest): Promise<CreateJobResponse> {
    logger.info({ job }, 'Olo order create stub');
    return { externalJobId: `olo_${Date.now()}` };
  }

  async cancel(externalJobId: string): Promise<void> {
    logger.info({ externalJobId }, 'Olo cancel stub');
  }

  parseWebhook(req: Request): DeliveryUpdate {
    const payload = req.body as Record<string, any>;
    logger.info({ payload }, 'Olo webhook stub');
    return {
      status: payload.eventType ?? 'received',
      timestamps: payload.timestamps ?? {},
      proof: payload.proof
    };
  }
}
