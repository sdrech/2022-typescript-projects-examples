import { ApiProperty, PartialType } from '@nestjs/swagger'
import { DeviceMobileTraffic } from '../entities/device-mobile-traffic.entity'
import { RequestIdDto } from '@company-name/cloud-core/dist/dto/requestId.dto'

export class DeviceMobileTrafficResponseParams extends PartialType(
  DeviceMobileTraffic,
) {
  @ApiProperty({
    type: Number,
  })
  dataUsageTx: number

  @ApiProperty({
    type: Number,
  })
  dataUsageRx: number
}

export class GetDeviceMobileTrafficResponseDto extends RequestIdDto {
  @ApiProperty({ type: DeviceMobileTrafficResponseParams })
  data: DeviceMobileTrafficResponseParams
}
