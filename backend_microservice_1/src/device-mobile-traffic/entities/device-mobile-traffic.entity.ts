import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import moment from 'moment'
import { Document } from 'mongoose'

export type DeviceMobileTrafficDocument = DeviceMobileTraffic & Document

@Schema({
  collection: 'DeviceMobileTraffic',
  versionKey: false,
  timestamps: { createdAt: false, updatedAt: true },
})
export class DeviceMobileTraffic {
  @Prop({
    index: true,
  })
  imei: string

  @Prop({
    required: true,
  })
  dataUsageRx: number

  @Prop({
    required: true,
  })
  dataUsageTx: number

  @Prop({ default: moment().utc().format('YYYY-MM-DD') })
  createdDate: string

  @Prop({ type: Date })
  updatedAt: Date
}

export const DeviceMobileTrafficSchema =
  SchemaFactory.createForClass(DeviceMobileTraffic)
