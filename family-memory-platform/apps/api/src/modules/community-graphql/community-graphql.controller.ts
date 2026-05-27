import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { CommunityGraphqlService } from './community-graphql.service';

class GraphqlRequestDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  operationName?: string;
}

@ApiTags('community-graphql')
@Controller('community/graphql')
export class CommunityGraphqlController {
  constructor(private readonly gql: CommunityGraphqlService) {}

  @Post()
  run(@Body() body: GraphqlRequestDto) {
    return this.gql.execute({ query: body.query, variables: body.variables });
  }
}
