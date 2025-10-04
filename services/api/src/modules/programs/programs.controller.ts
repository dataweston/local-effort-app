import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { CreateProgramDto } from './dto/create-program.dto';
import { ProgramsService } from './programs.service';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProgramDto) {
    return this.programsService.upsert(dto);
  }
}
