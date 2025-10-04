import { Controller, Get, Query } from '@nestjs/common';

import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(@Query('org') orgId: string) {
    return this.invoicesService.listByOrg(orgId);
  }
}
