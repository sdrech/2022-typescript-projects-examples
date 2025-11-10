import { ApiProperty, OmitType } from '@nestjs/swagger'
import { CreateBulkEventConfigDto } from './create-bulk-event-config.dto'
import { RequestIdDto } from '@company-name/cloud-core/dist/dto/requestId.dto'

export class GetBulkEventConfigDto extends OmitType(CreateBulkEventConfigDto, [
  'triggers',
] as const) {}

export class TriggerResponseDto extends CreateBulkEventConfigDto {
  imei: string
}

export class GetBulkEventConfigOneResponseDto extends RequestIdDto {
  @ApiProperty({ type: TriggerResponseDto })
  data: string
}

export class GetBulkEventConfigManyResponseDto extends RequestIdDto {
  @ApiProperty({ type: [TriggerResponseDto] })
  data: string
}
