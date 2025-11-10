import {
  IDataUsageDailyCounters,
  IDataUsageMonthlyCounters,
} from './device-data-usage.interface'

export const props = {
  billingDay: {
    description: 'Day of the month when monthly counters should be reset',
    minimum: 1,
    maximum: 31,
  },
  liveStreamingSecondsThisMonth: {
    description: 'Device live video minutes per month',
    minimum: 0,
    default: 0,
  },
  liveStreamingBytesThisMonth: {
    description: 'The volume of live video [Bytes/month]',
    minimum: 0,
    default: undefined,
  },
  recordStreamingSecondsThisMonth: {
    description: 'Device recording video minutes per month',
    minimum: 0,
    default: 0,
  },
  recordStreamingBytesThisMonth: {
    description: 'The volume of playing recorded video [Bytes/month]',
    minimum: 0,
    default: undefined,
  },
  recordingsUploadBytesThisMonth: {
    description: 'The volume of downloading recorded video [Bytes/month]',
    minimum: 0,
    default: undefined,
  },
  totalVideoEventsToday: {
    description: 'Device video events per day',
    minimum: 0,
    default: 0,
  },
  totalVideoEventsThisMonth: {
    description: 'Device video events per month',
    minimum: 0,
    default: 0,
  },
  eventsBytesThisMonth: {
    description: 'The volume of events usage [Bytes/month]',
    minimum: 0,
    default: undefined,
  },
  lastUpdateEventsCounters: {
    default: new Date().toISOString(),
  },
  updatedAt: {
    default: Date.now,
  },
  resetRequestedAt: {
    default: undefined,
  },
}

export const defaultDataUsageMonthlyCounters: IDataUsageMonthlyCounters = {
  liveStreamingSecondsThisMonth: 0,
  liveStreamingBytesThisMonth: 0,
  recordStreamingSecondsThisMonth: 0,
  recordStreamingBytesThisMonth: 0,
  totalVideoEventsThisMonth: 0,
  eventsBytesThisMonth: 0,
}

export const defaultDataUsageDailyCounters: IDataUsageDailyCounters = {
  totalVideoEventsToday: 0,
}

export const defaultDataUsage: IDataUsageMonthlyCounters &
  IDataUsageDailyCounters = {
  ...defaultDataUsageMonthlyCounters,
  ...defaultDataUsageDailyCounters,
}
