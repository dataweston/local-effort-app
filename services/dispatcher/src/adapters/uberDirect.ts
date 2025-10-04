import type { Request } from 'express';
import pino from 'pino';

import type { CourierAdapter, CreateJobRequest, CreateJobResponse, DeliveryUpdate, QuoteRequest, QuoteResponse } from '..';

const logger = pino({ name: 'uber-direct-adapter' });

export class UberDirectAdapter implements CourierAdapter {
  constructor(private readonly clientId: string, private readonly clientSecret: string) {}

  async quote(req: QuoteRequest): Promise<QuoteResponse> {
    logger.info({ req }, 'requesting Uber Direct quote');
    return { fee: 24, currency: 'USD', etaMinutes: 35 };
  }

  async create(job: CreateJobRequest): Promise<CreateJobResponse> {
    logger.info({ job }, 'creating Uber Direct job');
    return { externalJobId: `uber_${Date.now()}`, trackingUrl: 'https://direct.uber.com/track/demo' };
  }

  async cancel(externalJobId: string): Promise<void> {
    logger.info({ externalJobId }, 'cancel Uber Direct job');
  }

  parseWebhook(req: Request): DeliveryUpdate {
    const payload = req.body as Record<string, any>;
    logger.info({ payload }, 'received Uber Direct webhook');
    return {
      status: payload.event ?? 'unknown',
      timestamps: payload.timestamps ?? {},
      proof: payload.proof
    };
  }
}
