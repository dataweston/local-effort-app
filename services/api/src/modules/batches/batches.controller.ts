import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import { BatchesService } from './batches.service';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get(':id/manifest')
  manifest(@Param('id') id: string) {
    return this.batchesService.manifest(id);
  }

  @Post(':id/labels')
  @HttpCode(HttpStatus.ACCEPTED)
  requestLabels(@Param('id') id: string) {
    return this.batchesService.requestLabels(id);
  }

  @Get(':id/labels')
  getLabels(@Param('id') id: string) {
    return this.batchesService.getLabels(id);
  }
}
