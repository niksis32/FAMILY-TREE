import { WEBHOOK_EVENT_TYPES } from '@family/shared';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsSafeWebhookUrl } from './webhook-url.validator';

export class CreateWebhookEndpointDto {
  @IsUrl({ require_tld: false })
  @IsSafeWebhookUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(WEBHOOK_EVENT_TYPES, { each: true })
  subscribedEvents!: (typeof WEBHOOK_EVENT_TYPES)[number][];
}

export class UpdateWebhookEndpointDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  @IsSafeWebhookUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(WEBHOOK_EVENT_TYPES, { each: true })
  subscribedEvents?: (typeof WEBHOOK_EVENT_TYPES)[number][];

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';
}

export class ListWebhookEventsQueryDto {
  @IsOptional()
  @IsString()
  endpointId?: string;

  @IsOptional()
  @IsIn(WEBHOOK_EVENT_TYPES)
  eventType?: (typeof WEBHOOK_EVENT_TYPES)[number];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
