import { Test, TestingModule } from '@nestjs/testing'
import { DeviceDataUsageController } from './device-data-usage.controller'
import { DeviceDataUsageService } from './device-data-usage.service'
import { CreateDeviceDataUsageDto } from './dto/create-device-data-usage.dto'
import { IncreaseDataUsageCountersDto } from './dto/increase-data-usage-counters.dto'
import { DataUsageLimitationDto } from './dto/data-usage-limitation.dto'
import { dataUsageLimitation } from '../../test/stubs/device-data-usage-limitation.stub'
import { IncomingKafkaMessage } from '@company-name/cloud-core/dist/interfaces/incoming-kafka-message'
import { mockMessageDefaults } from '@company-name/cloud-core/dist/test-mocks'
import { KafkaTopics } from '@company-name/cloud-core/dist/interfaces/kafka-topics'

const testImei = '12345'

describe('DeviceDataUsageController', () => {
  let controller: DeviceDataUsageController
  let service: DeviceDataUsageService

  function initReq(requestId: string) {
    return {
      requestId,
    } as Request & { requestId: string }
  }

  const requestId = '4ac83f23-480b-497a-8d97-d2190c773afe'

  beforeEach(async () => {
    const DeviceDataUsageServiceProvider = {
      provide: DeviceDataUsageService,
      useValue: {
        create: jest.fn(),
        getActualOne: jest.fn(),
        increaseCounters: jest.fn(),
        areEventLimitsReachedAndCountersNotIncreased: jest.fn(),
        remove: jest.fn(),
        removeMany: jest.fn(),
        findLastOne: jest.fn(),
        findManyByImei: jest.fn(),
        getHistory: jest.fn(),
        createOne: jest.fn(),
      },
    }
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceDataUsageController],
      providers: [DeviceDataUsageServiceProvider],
    }).compile()

    controller = module.get<DeviceDataUsageController>(
      DeviceDataUsageController,
    )

    service = module.get<DeviceDataUsageService>(DeviceDataUsageService)
    jest.clearAllMocks()
    jest.spyOn((controller as any).logger, 'error').mockImplementation()
    jest.spyOn((controller as any).logger, 'log').mockImplementation()
    jest.spyOn((controller as any).logger, 'debug').mockImplementation()
    jest.spyOn((controller as any).logger, 'warn').mockImplementation()
  })

  it('data-usage-controller-1: to be defined', () => {
    expect(controller).toBeDefined()
    expect(service).toBeDefined()
  })

  it('data-usage-controller-2: call create()', async () => {
    const createDeviceDataUsageDto: CreateDeviceDataUsageDto = {
      imei: '456',
      billingDay: 10,
    }
    await controller.create(initReq(requestId), createDeviceDataUsageDto)
    expect(service.create).toBeCalledWith(createDeviceDataUsageDto, requestId)
  })

  // it('data-usage-controller-3: call getFreshOne()', async () => {
  //   const findDeviceDataUsageAndUpdateDto: GetFreshDeviceDataUsageDto = {
  //     billingDay: 1,
  //   }
  //   const imei = '123'
  //   await controller.getFreshOne(
  //     initReq(requestId),
  //     imei,
  //     findDeviceDataUsageAndUpdateDto,
  //   )
  //   expect(service.getActualOne).toBeCalledWith(
  //     imei,
  //     findDeviceDataUsageAndUpdateDto.billingDay,
  //     requestId,
  //   )
  // })

  it('data-usage-controller-4: call patchCounters()', async () => {
    const imei = '456'
    const updateDeviceDataUsageDto: IncreaseDataUsageCountersDto = {
      totalVideoEventsToday: 1,
      totalVideoEventsThisMonth: 1,
      billingDay: 10,
    }
    await controller.patchCounters(
      initReq(requestId),
      imei,
      updateDeviceDataUsageDto,
    )
    expect(service.increaseCounters).toBeCalledWith(
      imei,
      updateDeviceDataUsageDto,
      requestId,
    )
  })

  it('data-usage-controller-5: call processEventsStatus()', async () => {
    const dataUsageLimitationDto: DataUsageLimitationDto =
      dataUsageLimitation.data
    await controller.processEventsStatus(
      initReq(requestId),
      dataUsageLimitationDto,
    )
    expect(service.areEventLimitsReachedAndCountersNotIncreased).toBeCalledWith(
      dataUsageLimitationDto.serialNumber,
      requestId,
      dataUsageLimitationDto,
    )
  })

  it('data-usage-controller-6: call remove()', async () => {
    const imei = '12345'
    await controller.remove(initReq(requestId), imei)

    expect(controller.remove).toBeTruthy()
    expect(service.remove).toBeCalledTimes(1)
    expect(service.remove).toBeCalledWith(imei, requestId)
  })

  it('data-usage-controller-7: call removeMany()', async () => {
    const imeis = ['12345', '98765']
    await controller.removeMany(initReq(requestId), { imeis })

    expect(controller.removeMany).toBeTruthy()
    expect(service.removeMany).toBeCalledTimes(1)
    expect(service.removeMany).toBeCalledWith(imeis, requestId)
  })

  it('data-usage-controller-8: call getRecordedOne()', async () => {
    await controller.getRecordedOne(initReq(requestId), 'imei')
    expect(service.findLastOne).toBeCalledWith('imei', requestId)
  })

  it('data-usage-controller-9: call getHistory()', async () => {
    await controller.getHistory(initReq(requestId), 'imei')
    expect(service.getHistory).toBeCalledWith('imei', requestId)
  })

  describe('processFactoryResetDataUsage', () => {
    it('processFactoryResetDataUsage-1: sanity', async () => {
      jest.spyOn(service, 'createOne').mockResolvedValue()
      const mockMessage: IncomingKafkaMessage<any, string> = {
        ...mockMessageDefaults,
        topic: KafkaTopics.cloudFactoryResetReceived,
        key: testImei,
        value: {},
      }
      await controller.processFactoryResetDataUsage(mockMessage)
      expect(service.createOne).toBeCalled()
    })
  })

  describe('processDeviceDiagnostics', () => {
    it('processDeviceDiagnostics-1: should call to deviceDataUsageService.createOne', async () => {
      jest.spyOn(service, 'createOne').mockResolvedValue()
      const mockMessage: IncomingKafkaMessage<any, string> = {
        ...mockMessageDefaults,
        topic: KafkaTopics.deviceDataDiagnostics,
        key: testImei,
        value: { dataUsageTx: 0, dataUsageRx: 0 },
      }
      await controller.processDeviceDiagnostics(mockMessage)
      expect(service.createOne).toBeCalled()
    })

    it('processDeviceDiagnostics-2: should not call to deviceDataUsageService.createOne', async () => {
      jest.spyOn(service, 'createOne').mockResolvedValue()
      const mockMessage: IncomingKafkaMessage<any, string> = {
        ...mockMessageDefaults,
        topic: KafkaTopics.deviceDataDiagnostics,
        key: testImei,
        value: { dataUsageTx: 1, dataUsageRx: 0 },
      }
      await controller.processDeviceDiagnostics(mockMessage)
      expect(service.createOne).not.toBeCalled()
    })
  })
})
