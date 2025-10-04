import { Controller, Get, Param, Post } from '@nestjs/common';

import { BatchesService } from './batches.service';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get(':id/manifest')
  manifest(@Param('id') id: string) {
    return this.batchesService.manifest(id);
  }

  @Post(':id/labels')
  labels(@Param('id') id: string) {
    return this.batchesService.labels(id);
  }
}
