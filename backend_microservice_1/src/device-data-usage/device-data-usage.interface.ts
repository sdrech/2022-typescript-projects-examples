export interface IDataUsageMonthlyCounters {
  liveStreamingSecondsThisMonth: number
  recordStreamingSecondsThisMonth: number
  totalVideoEventsThisMonth: number
  liveStreamingBytesThisMonth?: number
  recordStreamingBytesThisMonth?: number
  eventsBytesThisMonth?: number
}

export interface IDataUsageDailyCounters {
  totalVideoEventsToday: number
}

export interface IDataUsage
  extends IDataUsageMonthlyCounters,
    IDataUsageDailyCounters {
  imei: string
}
