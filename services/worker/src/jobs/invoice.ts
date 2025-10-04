import type { Job } from 'bullmq';
import type { PrismaClient } from '@local-office/db';
import { BatchStatus, InvoicePeriod, Prisma } from '@local-office/db';

export interface InvoiceJobData {
  orgId?: string;
  period?: InvoicePeriod;
  periodStart?: string;
  periodEnd?: string;
}

export interface InvoiceSummary {
  orgId: string;
  invoiceId: string;
  batchCount: number;
  total: string;
}

const ZERO = new Prisma.Decimal(0);

function resolvePeriodRange(period: InvoicePeriod, start?: string, end?: string) {
  if (start && end) {
    return { start: new Date(start), end: new Date(end) };
  }

  const now = new Date();

  if (period === InvoicePeriod.MONTH) {
    const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const endOfPrevMonth = new Date(Date.UTC(startOfPrevMonth.getUTCFullYear(), startOfPrevMonth.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return { start: startOfPrevMonth, end: endOfPrevMonth };
  }

  const day = now.getUTCDay();
  const diffToLastMonday = ((day + 6) % 7) + 7;
  const startOfPrevWeek = new Date(now);
  startOfPrevWeek.setUTCDate(startOfPrevWeek.getUTCDate() - diffToLastMonday);
  startOfPrevWeek.setUTCHours(0, 0, 0, 0);
  const endOfPrevWeek = new Date(startOfPrevWeek);
  endOfPrevWeek.setUTCDate(startOfPrevWeek.getUTCDate() + 6);
  endOfPrevWeek.setUTCHours(23, 59, 59, 999);
  return { start: startOfPrevWeek, end: endOfPrevWeek };
}

export function createInvoiceJob(prisma: PrismaClient) {
  async function processInvoice(orgId: string, period: InvoicePeriod, start: Date, end: Date): Promise<InvoiceSummary> {
    return prisma.$transaction(async (tx) => {
      const batches = await tx.batch.findMany({
        where: {
          orgId,
          status: { in: [BatchStatus.LOCKED, BatchStatus.SENT, BatchStatus.DELIVERED] },
          programSlot: {
            serviceDate: {
              gte: start,
              lte: end
            }
          }
        },
        include: {
          orders: true
        }
      });

      const totals = batches.reduce(
        (acc, batch) => {
          const orderTotal = batch.orders.reduce((orderAcc, order) => orderAcc.plus(order.total), ZERO);
          const delivery = batch.deliveryFee ?? ZERO;
          const gratuity = batch.gratuity ?? ZERO;
          const lineTotal = orderTotal.plus(delivery).plus(gratuity);

          return {
            subtotal: acc.subtotal.plus(orderTotal),
            deliveryTotal: acc.deliveryTotal.plus(delivery),
            tipsTotal: acc.tipsTotal.plus(gratuity),
            total: acc.total.plus(lineTotal)
          };
        },
        {
          subtotal: ZERO,
          deliveryTotal: ZERO,
          tipsTotal: ZERO,
          total: ZERO
        }
      );

      const existing = await tx.invoice.findFirst({
        where: {
          orgId,
          period,
          periodStart: start,
          periodEnd: end
        }
      });

      const invoice = existing
        ? await tx.invoice.update({
            where: { id: existing.id },
            data: {
              subtotal: totals.subtotal,
              deliveryTotal: totals.deliveryTotal,
              tipsTotal: totals.tipsTotal,
              total: totals.total
            }
          })
        : await tx.invoice.create({
            data: {
              orgId,
              period,
              periodStart: start,
              periodEnd: end,
              subtotal: totals.subtotal,
              deliveryTotal: totals.deliveryTotal,
              tipsTotal: totals.tipsTotal,
              total: totals.total
            }
          });

      await tx.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });

      for (const batch of batches) {
        const orderTotal = batch.orders.reduce((acc, order) => acc.plus(order.total), ZERO);
        const delivery = batch.deliveryFee ?? ZERO;
        const gratuity = batch.gratuity ?? ZERO;
        const lineTotal = orderTotal.plus(delivery).plus(gratuity);

        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            batchId: batch.id,
            description: `Batch ${batch.id}`,
            quantity: 1,
            unitAmount: lineTotal,
            total: lineTotal
          }
        });
      }

      return { orgId, invoiceId: invoice.id, batchCount: batches.length, total: invoice.total.toString() };
    });
  }

  return async function handleInvoice(job: Job<InvoiceJobData>): Promise<InvoiceSummary[]> {
    const { orgId, period = InvoicePeriod.WEEK, periodStart, periodEnd } = job.data ?? {};
    const range = resolvePeriodRange(period, periodStart, periodEnd);

    const orgIds = orgId
      ? [orgId]
      : (
          await prisma.batch.findMany({
            where: {
              programSlot: {
                serviceDate: {
                  gte: range.start,
                  lte: range.end
                }
              }
            },
            select: { orgId: true },
            distinct: ['orgId']
          })
        ).map((batch) => batch.orgId);

    const results: InvoiceSummary[] = [];
    for (const id of orgIds) {
      results.push(await processInvoice(id, period, range.start, range.end));
    }

    return results;
  };
}
