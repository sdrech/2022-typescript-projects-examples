import { ApiProperty } from '@nestjs/swagger'
import { props } from '../device-data-usage.constants'

export class GetFreshDeviceDataUsageDto {
  @ApiProperty({
    type: Number,
    required: true,
    minimum: props.billingDay.minimum,
    maximum: props.billingDay.maximum,
    description: props.billingDay.description,
    example: 1,
  })
  billingDay: number
}
