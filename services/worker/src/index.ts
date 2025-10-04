import { Queue, Worker, QueueScheduler, JobsOptions } from 'bullmq';
import { createIdempotencyKey } from '@local-office/lib';
import { prisma } from '@local-office/db';
import { createLabelsProcessor } from './processors/labels';
import { createObjectStorage } from './storage';
import pino from 'pino';

const connection = {
  connection: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379'
  }
};

const logger = pino({ name: 'local-office-worker' });

export const queues = {
  batcher: new Queue('batcher', connection),
  labels: new Queue('labels', connection),
  notify: new Queue('notify', connection),
  invoice: new Queue('invoice', connection),
  webhookOut: new Queue('webhook-out', connection)
};

Object.values(queues).forEach((queue) => new QueueScheduler(queue.name, connection));

const objectStorage = createObjectStorage();
const labelsProcessor = createLabelsProcessor({ prisma, storage: objectStorage });

function withLogging<T>(name: string, handler: (job: any) => Promise<T>) {
  return async (job: any) => {
    const start = Date.now();
    logger.info({ queue: name, jobId: job.id, name: job.name }, 'job started');
    try {
      const result = await handler(job);
      logger.info({ queue: name, jobId: job.id, durationMs: Date.now() - start }, 'job completed');
      return result;
    } catch (error) {
      logger.error({ queue: name, jobId: job.id, error }, 'job failed');
      throw error;
    }
  };
}

new Worker(
  queues.batcher.name,
  withLogging('batcher', async () => {
    // Placeholder for cron-triggered batching logic.
  }),
  connection
);

new Worker(queues.labels.name, withLogging('labels', labelsProcessor), connection);

new Worker(
  queues.notify.name,
  withLogging('notify', async () => {
    // Send emails and SMS notifications.
  }),
  connection
);

new Worker(
  queues.invoice.name,
  withLogging('invoice', async () => {
    // Aggregate weekly/monthly invoices.
  }),
  connection
);

new Worker(
  queues.webhookOut.name,
  withLogging('webhook-out', async () => {
    // Deliver outbound webhooks with retries.
  }),
  connection
);

export async function enqueueBatchLock(data: Record<string, unknown>, opts?: JobsOptions) {
  return queues.batcher.add('lock-orders', data, {
    jobId: data['idempotencyKey'] as string | undefined ?? createIdempotencyKey('batch-lock'),
    ...opts
  });
}

export async function enqueueBatchLabels(batchId: string, opts?: JobsOptions) {
  return queues.labels.add(
    'generate-batch-labels',
    { batchId },
    {
      jobId: `batch-labels:${batchId}`,
      removeOnComplete: true,
      removeOnFail: true,
      ...opts
    }
  );
}

logger.info('Worker bootstrapped');
