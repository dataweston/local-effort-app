import { PrismaClient } from '@local-office/db';
import { generateBatchLabels, LabelInput } from '@local-office/labeler';
import type { Job } from 'bullmq';
import { buildObjectKey, ObjectStorageClient } from '../storage';

export interface LabelsJobData {
  batchId: string;
}

export interface LabelsProcessorDependencies {
  prisma: PrismaClient;
  storage: ObjectStorageClient;
  now?: () => Date;
}

interface BatchForLabels {
  id: string;
  orders: Array<{
    id: string;
    user: { id: string; firstName: string; lastName: string };
    items: Array<{
      id: string;
      quantity: number;
      sku: {
        id: string;
        name: string;
        allergens: Array<{ allergen: { id: string; name: string } }>;
      };
    }>;
  }>;
}

function expandLabelInputs(batchId: string, batch: BatchForLabels): LabelInput[] {
  const inputs: LabelInput[] = [];

  for (const order of batch.orders) {
    const fullName = `${order.user.firstName} ${order.user.lastName}`.trim();

    for (const item of order.items) {
      const allergens = item.sku.allergens.map((entry) => entry.allergen.name);

      for (let index = 0; index < item.quantity; index += 1) {
        inputs.push({
          name: fullName,
          item: item.sku.name,
          allergens,
          orderId: order.id
        });
      }
    }
  }

  return inputs;
}

export function createLabelsProcessor({ prisma, storage, now = () => new Date() }: LabelsProcessorDependencies) {
  return async (job: Job<LabelsJobData>) => {
    const batchId = job.data?.batchId;

    if (!batchId) {
      throw new Error('batchId is required to generate labels');
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        orders: {
          include: {
            user: true,
            items: {
              include: {
                sku: {
                  include: {
                    allergens: {
                      include: { allergen: true }
                    }
                  }
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

    const labelInputs = expandLabelInputs(batchId, batch as BatchForLabels);

    if (!labelInputs.length) {
      await prisma.label.deleteMany({ where: { batchId } });
      return { batchId, labelCount: 0, pdfUrl: null, zplUrl: null };
    }

    const { pdf, zpl } = await generateBatchLabels(batchId, labelInputs);

    const pdfKey = buildObjectKey(batchId, 'pdf', now);
    const zplKey = buildObjectKey(batchId, 'zpl', now);

    const [pdfUrl, zplUrl] = await Promise.all([
      storage.upload({ key: pdfKey, body: pdf, contentType: 'application/pdf' }),
      storage.upload({ key: zplKey, body: Buffer.from(zpl, 'utf8'), contentType: 'application/zpl' })
    ]);

    await prisma.label.deleteMany({ where: { batchId } });
    await prisma.label.createMany({
      data: labelInputs.map((input) => ({
        batchId,
        orderId: input.orderId,
        name: input.name,
        item: input.item,
        allergens: input.allergens,
        pdfUrl,
        zplUrl
      }))
    });

    return { batchId, labelCount: labelInputs.length, pdfUrl, zplUrl };
  };
}
