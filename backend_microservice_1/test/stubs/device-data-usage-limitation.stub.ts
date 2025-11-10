import { IDataUsageLimitationRes } from '@company-name/cloud-core/dist/interfaces/data-usage'

export const dataUsageLimitation: IDataUsageLimitationRes = {
  status: {
    code: 0,
    error: 'Operation Successful',
  },
  data: {
    serialNumber: '123',
    billingDayOfMonth: 1,
    liveVideoMinutesMonth: 1,
    recordingVideoMinutesMonth: 1,
    videoEventsDay: 1,
    videoEventsMonth: 1,
  },
}
