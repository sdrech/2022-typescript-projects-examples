import { Test, TestingModule } from '@nestjs/testing'
import { DeviceMobileTrafficController } from './device-mobile-traffic.controller'
import { DeviceMobileTrafficService } from './device-mobile-traffic.service'
import crypto from 'crypto'
import moment from 'moment'

describe('DeviceMobileTrafficController', () => {
  let controller: DeviceMobileTrafficController
  let service: DeviceMobileTrafficService

  function initReq(requestId: string) {
    return {
      requestId,
    } as Request & { requestId: string }
  }

  const requestId = '4ac83f23-480b-497a-8d97-d2190c773afe'
  const imei = '123'
  const billingDate = '2023-01-18'

  beforeEach(async () => {
    const DeviceMobileTrafficServiceProvider = {
      provide: DeviceMobileTrafficService,
      useValue: {
        createOrUpdate: jest.fn(),
        getActualData: jest.fn(),
        getHistory: jest.fn(),
      },
    }
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceMobileTrafficController],
      providers: [DeviceMobileTrafficServiceProvider],
    }).compile()

    controller = module.get<DeviceMobileTrafficController>(
      DeviceMobileTrafficController,
    )

    service = module.get<DeviceMobileTrafficService>(DeviceMobileTrafficService)
    jest.clearAllMocks()
  })

  it('mobile-traffic-controller-1: should be defined', () => {
    expect(controller).toBeDefined()
    expect(service).toBeDefined()
  })

  describe('processDeviceDiagnostics', () => {
    it('mobile-traffic-controller-1: should call processDeviceDiagnostics()', async () => {
      jest.spyOn(crypto, 'randomUUID').mockReturnValue(requestId)
      const kafkaMessage: any = {
        key: '456',
        value: {
          dataUsageRx: 1,
          dataUsageTx: 1,
        },
      }
      await controller.processDeviceDiagnostics(kafkaMessage)
      expect(service.createOrUpdate).toBeCalledWith(
        {
          imei: kafkaMessage.key,
          dataUsageRx: kafkaMessage.value.dataUsageRx * 1024 * 1024,
          dataUsageTx: kafkaMessage.value.dataUsageTx * 1024 * 1024,
          createdDate: moment().utc().format('YYYY-MM-DD'),
        },
        requestId,
      )
    })
  })

  describe('getActualData', () => {
    it('mobile-traffic-controller-1: should call getActualData()', async () => {
      await controller.getActualData(initReq(requestId), imei, billingDate)
      expect(service.getActualData).toBeCalledWith(imei, billingDate, requestId)
    })
  })

  describe('getHistory', () => {
    it('mobile-traffic-controller-1: should call getHistory()', async () => {
      await controller.getHistory(initReq(requestId), imei)
      expect(service.getHistory).toBeCalledWith(imei, requestId)
    })
  })
})
