import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

/** CRUD for Person entities — core of family tree */
@Module({
  imports: [AuthModule, PrismaModule, SearchModule],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
