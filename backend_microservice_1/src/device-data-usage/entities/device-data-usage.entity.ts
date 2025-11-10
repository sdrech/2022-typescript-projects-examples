import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { props } from '../device-data-usage.constants'
import { IDataUsage } from '../device-data-usage.interface'

export type DeviceDataUsageDocument = DeviceDataUsage & Document

/**
 * This model supports containing multiple records per each imei
 */
@Schema({
  collection: 'DeviceDataUsageHistory',
  versionKey: false,
  timestamps: { createdAt: false, updatedAt: true },
})
export class DeviceDataUsage {
  constructor(data: IDataUsage, billingDay: number) {
    for (const key in data) {
      this[key] = data[key]
    }

    this.billingDay = billingDay
    this.lastUpdateEventsCounters = new Date().toISOString()
    this.updatedAt = new Date()
  }

  @Prop({
    index: true,
    required: true,
  })
  imei: string

  @Prop({
    required: true,
  })
  billingDay: number

  @Prop({
    min: props.liveStreamingSecondsThisMonth.minimum,
    default: props.liveStreamingSecondsThisMonth.default,
  })
  liveStreamingSecondsThisMonth: number

  @Prop({
    min: props.liveStreamingBytesThisMonth.minimum,
    default: props.liveStreamingBytesThisMonth.default,
  })
  liveStreamingBytesThisMonth?: number

  @Prop({
    min: props.recordStreamingSecondsThisMonth.minimum,
    default: props.recordStreamingSecondsThisMonth.default,
  })
  recordStreamingSecondsThisMonth: number

  @Prop({
    min: props.recordStreamingBytesThisMonth.minimum,
    default: props.recordStreamingBytesThisMonth.default,
  })
  recordStreamingBytesThisMonth?: number

  @Prop({
    min: props.recordingsUploadBytesThisMonth.minimum,
    default: props.recordingsUploadBytesThisMonth.default,
  })
  recordingsUploadBytesThisMonth?: number

  @Prop({
    min: props.totalVideoEventsToday.minimum,
    default: props.totalVideoEventsToday.default,
  })
  totalVideoEventsToday: number

  @Prop({
    min: props.totalVideoEventsThisMonth.minimum,
    default: props.totalVideoEventsThisMonth.default,
  })
  totalVideoEventsThisMonth: number

  @Prop({
    min: props.eventsBytesThisMonth.minimum,
    default: props.eventsBytesThisMonth.default,
  })
  eventsBytesThisMonth?: number

  @Prop({
    default: props.lastUpdateEventsCounters.default,
  })
  lastUpdateEventsCounters: string

  @Prop({ default: props.updatedAt.default })
  updatedAt: Date

  @Prop({ default: props.resetRequestedAt.default })
  resetRequestedAt?: Date
}

export const DeviceDataUsageSchema =
  SchemaFactory.createForClass(DeviceDataUsage)
