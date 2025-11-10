import { ApiProperty } from '@nestjs/swagger'

export class DataUsageLimitationDto {
  @ApiProperty({
    required: true,
    type: String,
    example: '131313',
  })
  serialNumber: string

  @ApiProperty({
    required: true,
    type: Number,
    example: 1,
  })
  billingDayOfMonth: number

  @ApiProperty({
    required: true,
    type: Number,
    example: 1,
  })
  liveVideoMinutesMonth: number

  @ApiProperty({
    required: true,
    type: Number,
    example: 1,
  })
  recordingVideoMinutesMonth: number

  @ApiProperty({
    required: true,
    type: Number,
    example: 1,
  })
  videoEventsDay: number

  @ApiProperty({
    required: true,
    type: Number,
    example: 1,
  })
  videoEventsMonth: number
}
