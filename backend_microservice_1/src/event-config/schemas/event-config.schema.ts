import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { EventType, DataTypes } from '@company-name/cloud-core/dist/interfaces/events'

export type EventConfigDocument = EventConfigEntity & Document

@Schema({ collection: 'EventConfigs', versionKey: false })
export class EventConfigEntity {
  @Prop({
    index: true,
    required: true,
  })
  imei: string

  @Prop({
    type: [
      {
        trigger_type: { type: String, enum: EventType },
        data_type: { type: String, enum: DataTypes },
      },
    ],
    default: [],
  })
  triggers: {
    trigger_type: EventType
    data_type: DataTypes
  }[]
}

export const EventConfigSchema = SchemaFactory.createForClass(EventConfigEntity)
