import { DeviceMobileTrafficHistoryResponseParams } from 'src/device-mobile-traffic/dto/get-device-mobile-traffic-history-response.dto'
import { DeviceMobileTraffic } from 'src/device-mobile-traffic/entities/device-mobile-traffic.entity'

export const DeviceMobileTrafficStub = (
  imei = '131313',
): DeviceMobileTraffic => {
  return {
    dataUsageRx: 11,
    dataUsageTx: 12,
    imei,
    createdDate: '2023-01-24',
    updatedAt: new Date('2023-01-24T13:44:53.245Z'),
  }
}

export const DeviceMobileTrafficHistoryStub =
  (): DeviceMobileTrafficHistoryResponseParams[] => {
    return [
      {
        createdDate: '2023-01-23',
        dataUsageRx: 1,
        dataUsageTx: 2,
      },
      {
        createdDate: '2023-01-22',
        dataUsageRx: 1,
        dataUsageTx: 2,
      },
    ]
  }
