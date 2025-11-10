import { ApiProperty, PartialType } from '@nestjs/swagger'
import { DeviceMobileTraffic } from '../entities/device-mobile-traffic.entity'

export class MobileTrafficDto extends PartialType(DeviceMobileTraffic) {
  @ApiProperty({
    type: String,
    example: '131313',
  })
  imei: string

  @ApiProperty({ type: Number })
  dataUsageRx: number

  @ApiProperty({ type: Number })
  dataUsageTx: number

  @ApiProperty({ type: String })
  createdDate: string
}
