import { ApiProperty, PartialType } from '@nestjs/swagger'
import { DeviceMobileTraffic } from '../entities/device-mobile-traffic.entity'
import { RequestIdDto } from '@company-name/cloud-core/dist/dto/requestId.dto'

export class DeviceMobileTrafficHistoryResponseParams extends PartialType(
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

  @ApiProperty({ type: String })
  createdDate: string

  @ApiProperty({ type: Date })
  updatedAt?: Date
}

export class GetDeviceMobileTrafficHistoryResponseDto extends RequestIdDto {
  @ApiProperty({ type: [DeviceMobileTrafficHistoryResponseParams] })
  data: DeviceMobileTrafficHistoryResponseParams[]
}
