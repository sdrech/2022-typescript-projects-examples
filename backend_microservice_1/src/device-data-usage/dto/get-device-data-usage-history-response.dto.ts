import { ApiProperty } from '@nestjs/swagger'
import { RequestIdDto } from '@company-name/cloud-core/dist/dto/requestId.dto'

export class DeviceDataUsageHistoryResponseParams {
  @ApiProperty({
    type: Number,
  })
  dataUsageTx: number

  @ApiProperty({
    type: Number,
  })
  dataUsageRx: number

  @ApiProperty({
    type: Number,
  })
  eventsBytesThisMonth: number

  @ApiProperty({
    type: Number,
  })
  totalVideoEventsThisMonth: number

  @ApiProperty({
    type: Number,
  })
  totalVideoEventsToday: number

  @ApiProperty({
    type: Number,
  })
  recordStreamingSecondsThisMonth: number

  @ApiProperty({
    type: Number,
  })
  recordStreamingBytesThisMonth: number

  @ApiProperty({
    type: Number,
  })
  liveStreamingSecondsThisMonth: number

  @ApiProperty({
    type: Number,
  })
  liveStreamingBytesThisMonth: number

  @ApiProperty({ type: Date })
  updatedAt: Date
}

export class GetDeviceDataUsageHistoryResponseDto extends RequestIdDto {
  @ApiProperty({ type: [DeviceDataUsageHistoryResponseParams] })
  data: DeviceDataUsageHistoryResponseParams[]
}
