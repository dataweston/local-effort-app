import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async manifest(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        programSlot: {
          include: {
            program: {
              include: { site: true }
            },
            provider: true
          }
        },
        orders: {
          include: {
            items: {
              include: {
                sku: {
                  include: {
                    allergens: true
                  }
                }
              }
            },
            user: true
          }
        }
      }
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return {
      id: batch.id,
      status: batch.status,
      deliveryFee: batch.deliveryFee,
      gratuity: batch.gratuity,
      programSlot: {
        id: batch.programSlot.id,
        serviceDate: batch.programSlot.serviceDate,
        windowStart: batch.programSlot.windowStart,
        windowEnd: batch.programSlot.windowEnd,
        provider: {
          id: batch.programSlot.provider.id,
          name: batch.programSlot.provider.name
        },
        program: {
          id: batch.programSlot.program.id,
          name: batch.programSlot.program.name,
          site: {
            id: batch.programSlot.program.site.id,
            name: batch.programSlot.program.site.name
          }
        }
      },
      orders: batch.orders.map((order) => ({
        id: order.id,
        user: {
          id: order.user.id,
          name: `${order.user.firstName} ${order.user.lastName}`
        },
        status: order.status,
        notes: order.items.flatMap((item) => (item.notes ? [item.notes] : [])),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.sku.name,
          quantity: item.quantity,
          allergens: item.sku.allergens?.map((a) => a.allergenId) ?? []
        }))
      }))
    };
  }

  async labels(id: string) {
    const labels = await this.prisma.label.findMany({
      where: { batchId: id }
    });

    if (!labels.length) {
      throw new NotFoundException('Labels not ready for batch');
    }

    const pdfUrl = labels.find((label) => label.pdfUrl)?.pdfUrl ?? null;
    const zplUrl = labels.find((label) => label.zplUrl)?.zplUrl ?? null;

    return { pdfUrl, zplUrl };
  }
}
