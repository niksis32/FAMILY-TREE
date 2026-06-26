import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CemeteryService } from './cemetery.service';

@ApiTags('public-memorial')
@Controller('public/memorial')
export class CemeteryPublicController {
  constructor(private readonly service: CemeteryService) {}

  @Get(':token')
  resolve(@Param('token') token: string) {
    return this.service.getPublicMemorial(token);
  }
}
