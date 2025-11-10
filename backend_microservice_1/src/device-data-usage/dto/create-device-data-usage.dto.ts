import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { DeviceDataUsage } from '../entities/device-data-usage.entity'
import { props } from '../device-data-usage.constants'
import { RequestIdDto } from '@company-name/cloud-core/dist/dto/requestId.dto'

export class CreateDeviceDataUsageDto extends PartialType(DeviceDataUsage) {
  @ApiProperty({
    type: String,
    required: true,
    example: '131313',
  })
  imei: string

  @ApiProperty({
    type: Number,
    required: true,
    minimum: props.billingDay.minimum,
    maximum: props.billingDay.maximum,
    description: props.billingDay.description,
  })
  billingDay: number

  @ApiPropertyOptional({
    type: Number,
    minimum: props.liveStreamingSecondsThisMonth.minimum,
    default: props.liveStreamingSecondsThisMonth.default,
    description: props.liveStreamingSecondsThisMonth.description,
  })
  liveStreamingSecondsThisMonth?: number

  @ApiPropertyOptional({
    type: Number,
    minimum: props.recordStreamingSecondsThisMonth.minimum,
    default: props.recordStreamingSecondsThisMonth.default,
    description: props.recordStreamingSecondsThisMonth.description,
  })
  recordStreamingSecondsThisMonth?: number

  @ApiPropertyOptional({
    type: Number,
    minimum: props.totalVideoEventsToday.minimum,
    default: props.totalVideoEventsToday.default,
    description: props.totalVideoEventsToday.description,
  })
  totalVideoEventsToday?: number

  @ApiPropertyOptional({
    type: Number,
    minimum: props.totalVideoEventsThisMonth.minimum,
    default: props.totalVideoEventsThisMonth.default,
    description: props.totalVideoEventsThisMonth.description,
  })
  totalVideoEventsThisMonth?: number

  @ApiPropertyOptional({
    type: Number,
    minimum: props.recordStreamingBytesThisMonth.minimum,
    default: props.recordStreamingBytesThisMonth.default,
    description: props.recordStreamingBytesThisMonth.description,
  })
  recordStreamingBytesThisMonth?: number

  @ApiPropertyOptional({
    type: Number,
    minimum: props.recordingsUploadBytesThisMonth.minimum,
    default: props.recordingsUploadBytesThisMonth.default,
    description: props.recordingsUploadBytesThisMonth.description,
  })
  recordingsUploadBytesThisMonth?: number

  @ApiPropertyOptional({
    type: Number,
    minimum: props.eventsBytesThisMonth.minimum,
    default: props.eventsBytesThisMonth.default,
    description: props.eventsBytesThisMonth.description,
  })
  eventsBytesThisMonth?: number
}

export class GeneralDataUsageDtoResponse extends CreateDeviceDataUsageDto {
  @ApiPropertyOptional()
  dataUsageRx?: number

  @ApiPropertyOptional()
  dataUsageTx?: number
}

export class DataUsageDtoResponse extends RequestIdDto {
  @ApiProperty({ type: GeneralDataUsageDtoResponse })
  data: CreateDeviceDataUsageDto
}
