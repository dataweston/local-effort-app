import type { Job } from 'bullmq';
import type { PrismaClient } from '@local-office/db';
import { BatchStatus } from '@local-office/db';
import { generateBatchLabels, type LabelInput, type LabelRenderResult } from '@local-office/labeler';

export interface LabelJobData {
  batchId?: string;
}

export interface LabelJobResult {
  batchId: string;
  labelCount: number;
  pdfUrl?: string;
  zplUrl?: string;
}

export interface LabelJobDependencies {
  renderLabels?: (batchId: string, labels: LabelInput[]) => Promise<LabelRenderResult>;
}

export function createLabelJob(prisma: PrismaClient, deps: LabelJobDependencies = {}) {
  const render = deps.renderLabels ?? generateBatchLabels;

  async function generateForBatch(batchId: string): Promise<LabelJobResult> {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        orders: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: true,
            items: {
              include: {
                sku: {
                  include: { allergens: true }
                }
              }
            }
          }
        }
      }
    });

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const labels: LabelInput[] = [];
    for (const order of batch.orders) {
      const customerName = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ').trim();
      for (const item of order.items) {
        const allergens = item.sku.allergens?.map((a) => a.allergenId) ?? [];
        const quantity = item.quantity ?? 1;
        for (let index = 0; index < quantity; index += 1) {
          labels.push({
            name: customerName || order.user?.email || 'Guest',
            item: item.sku.name,
            allergens,
            orderId: order.id
          });
        }
      }
    }

    if (!labels.length) {
      await prisma.label.deleteMany({ where: { batchId } });
      return { batchId, labelCount: 0 };
    }

    const rendered = await render(batch.id, labels);
    const pdfUrl = `data:application/pdf;base64,${rendered.pdf.toString('base64')}`;
    const zplUrl = `data:application/zpl;base64,${Buffer.from(rendered.zpl, 'utf8').toString('base64')}`;

    await prisma.$transaction(async (tx) => {
      await tx.label.deleteMany({ where: { batchId } });
      for (const [index, label] of labels.entries()) {
        await tx.label.create({
          data: {
            batchId,
            orderId: label.orderId,
            name: label.name,
            item: label.item,
            allergens: label.allergens,
            pdfUrl: index === 0 ? pdfUrl : null,
            zplUrl: index === 0 ? zplUrl : null
          }
        });
      }
    });

    return { batchId, labelCount: labels.length, pdfUrl, zplUrl };
  }

  return async function handleLabel(job: Job<LabelJobData>): Promise<LabelJobResult[]> {
    const { batchId } = job.data ?? {};

    const targets = batchId
      ? [batchId]
      : (
          await prisma.batch.findMany({
            where: {
              status: { in: [BatchStatus.LOCKED, BatchStatus.SENT] },
              labels: { none: {} }
            },
            select: { id: true }
          })
        ).map((batch) => batch.id);

    const results: LabelJobResult[] = [];
    for (const target of targets) {
      results.push(await generateForBatch(target));
    }

    return results;
  };
}
