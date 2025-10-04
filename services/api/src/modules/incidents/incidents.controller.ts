import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(dto);
  }
}
