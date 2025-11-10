import { ApiPropertyOptional, OmitType } from '@nestjs/swagger'
import { props } from '../device-data-usage.constants'
import { CreateDeviceDataUsageDto } from './create-device-data-usage.dto'

export class IncreaseDataUsageCountersDto extends OmitType(
  CreateDeviceDataUsageDto,
  ['imei', 'billingDay'] as const,
) {
  @ApiPropertyOptional({
    type: Number,
    minimum: props.billingDay.minimum,
    maximum: props.billingDay.maximum,
    description: props.billingDay.description,
  })
  billingDay?: number
}
