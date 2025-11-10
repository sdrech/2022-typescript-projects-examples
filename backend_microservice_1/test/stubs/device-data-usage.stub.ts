import { DeviceDataUsage } from '../../src/device-data-usage/entities/device-data-usage.entity'

export const deviceDataUsageStub = (imei = '123'): DeviceDataUsage => {
  return {
    billingDay: 28,
    totalVideoEventsThisMonth: 0,
    totalVideoEventsToday: 0,
    recordStreamingSecondsThisMonth: 60,
    liveStreamingSecondsThisMonth: 30,
    lastUpdateEventsCounters: '2022-09-28T11:13:09.242Z',
    imei,
    updatedAt: new Date('2022-11-24T18:00:00.111Z'),
  }
}

export const deviceExtendedDataUsageStub = (imei = '123'): DeviceDataUsage => {
  const basicDeviceDataUsageStub = deviceDataUsageStub(imei)
  return {
    ...basicDeviceDataUsageStub,
    totalVideoEventsThisMonth: 100,
    totalVideoEventsToday: 10,
  }
}

export const defaultDataUsageCounters: Partial<DeviceDataUsage> = {
  liveStreamingSecondsThisMonth: 0,
  recordStreamingSecondsThisMonth: 0,
  totalVideoEventsToday: 0,
  totalVideoEventsThisMonth: 0,
}
