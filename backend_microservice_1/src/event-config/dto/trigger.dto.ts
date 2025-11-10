import { ApiProperty } from '@nestjs/swagger'
import { EventType, DataTypes } from '@company-name/cloud-core/dist/interfaces/events'

export class TriggerDto {
  @ApiProperty({
    enum: EventType,
    description: 'The event type which this configuration refers to',
  })
  trigger_type: EventType

  @ApiProperty({
    enum: DataTypes,
    description:
      'Event setting - if "none" than neither video nor snapshot will be provided with the event. ' +
      'If "snapshot" than only a snapshot will be provided with the event. ' +
      'If "video" than only a video will be provided with the event. ' +
      'Applies to all event types',
  })
  data_type: DataTypes
}
