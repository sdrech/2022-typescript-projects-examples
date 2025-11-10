import { Test, TestingModule } from '@nestjs/testing'
import { DeviceMobileTrafficService } from './device-mobile-traffic.service'
import { getModelToken } from '@nestjs/mongoose'
import { DeviceMobileTraffic } from './entities/device-mobile-traffic.entity'
import { DeviceMobileTrafficModelMock } from '../../test/support/device-mobile-traffic-model.mock'
import {
  DeviceMobileTrafficHistoryStub,
  DeviceMobileTrafficStub,
} from '../../test/stubs/device-mobile-traffic.stub'

import { Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'

describe('DeviceMobileTrafficService', () => {
  DeviceMobileTrafficStub
  let service: DeviceMobileTrafficService
  let deviceMobileTrafficModelMock: DeviceMobileTrafficModelMock
  let loggerService: Logger
  const imei = '123'
  const requestId = 'd62f9082-e92a-4927-8d61-22decae74887'
  const mobileTrafficStub = DeviceMobileTrafficStub(imei)

  const httpServiceMock = {
    post: jest.fn(),
    put: jest.fn(),
    get: jest.fn(),
  }
  const httpProvider = {
    provide: HttpService,
    useValue: httpServiceMock,
  }

  beforeEach(async () => {
    const DeviceMobileTrafficModelProvider = {
      provide: getModelToken(DeviceMobileTraffic.name),
      useClass: DeviceMobileTrafficModelMock,
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceMobileTrafficService,
        DeviceMobileTrafficModelProvider,
        httpProvider,
      ],
    }).compile()

    service = module.get<DeviceMobileTrafficService>(DeviceMobileTrafficService)
    deviceMobileTrafficModelMock = module.get<DeviceMobileTrafficModelMock>(
      getModelToken(DeviceMobileTraffic.name),
    )
    loggerService = (service as any).logger
    jest.spyOn(loggerService, 'log')
    jest.spyOn(loggerService, 'error')
    jest.spyOn(loggerService, 'warn')
    jest.spyOn(loggerService, 'debug')
  })

  afterEach(jest.restoreAllMocks)

  it('mobile-traffic-service-1: should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createOrUpdate', () => {
    it('createOrUpdate-1 - should log successfull message', async () => {
      jest
        .spyOn(deviceMobileTrafficModelMock, 'findOneAndUpdate')
        .mockImplementation((): any => {
          return {
            exec: () => {
              return mobileTrafficStub
            },
          }
        })

      await service.createOrUpdate(mobileTrafficStub, requestId)
      expect(loggerService.log).toBeCalledWith({
        message: 'Successfully saved a mobile traffic document',
        method: 'createOrUpdate',
        imei,
        mobileTrafficDto: mobileTrafficStub,
        updatedMobileTraffic: mobileTrafficStub,
        requestId,
      })
    })

    it('createOrUpdate-2 - should log error message', async () => {
      const error = new Error()
      jest
        .spyOn(deviceMobileTrafficModelMock, 'findOneAndUpdate')
        .mockImplementation((): any => {
          return {
            exec: () => {
              throw error
            },
          }
        })

      await service.createOrUpdate(mobileTrafficStub, requestId)
      expect(loggerService.error).toBeCalledWith({
        message: 'Failed to save a mobile traffic document',
        method: 'createOrUpdate',
        imei,
        mobileTrafficDto: mobileTrafficStub,
        error,
        requestId,
      })
    })
  })

  describe('getActualData', () => {
    it('getActualData-1: returning the gap between the current date to the billing date', async () => {
      const billingDate = '2023-01-18'
      const lastMobileTrafficBeforeTheBillingDate = {
        dataUsageRx: 1,
        dataUsageTx: 2,
        imei,
        createdDate: '2023-01-17',
        updatedAt: new Date('2023-01-17T13:44:53.245Z'),
      }
      jest
        .spyOn(deviceMobileTrafficModelMock, 'findOne')
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return mobileTrafficStub
            },
          }
        })
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return lastMobileTrafficBeforeTheBillingDate
            },
          }
        })

      const mobileTraffic = await service.getActualData(
        imei,
        billingDate,
        requestId,
      )
      expect(mobileTraffic).toEqual({
        dataUsageRx:
          mobileTrafficStub.dataUsageRx -
          lastMobileTrafficBeforeTheBillingDate.dataUsageRx,
        dataUsageTx:
          mobileTrafficStub.dataUsageTx -
          lastMobileTrafficBeforeTheBillingDate.dataUsageTx,
      })
    })

    it('getActualData-2: returning zeros in case billing day is greater than last found doc', async () => {
      const billingDate = '2023-01-25'
      jest
        .spyOn(deviceMobileTrafficModelMock, 'findOne')
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return mobileTrafficStub
            },
          }
        })

      const mobileTraffic = await service.getActualData(
        imei,
        billingDate,
        requestId,
      )
      expect(mobileTraffic).toEqual({
        dataUsageRx: 0,
        dataUsageTx: 0,
      })
    })

    it('getActualData-3: returning the value the current date in case of not found last doc before the last billing date', async () => {
      const billingDate = '2023-01-18'
      jest
        .spyOn(deviceMobileTrafficModelMock, 'findOne')
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return mobileTrafficStub
            },
          }
        })
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return null
            },
          }
        })

      const mobileTraffic = await service.getActualData(
        imei,
        billingDate,
        requestId,
      )
      expect(mobileTraffic).toEqual({
        dataUsageRx: mobileTrafficStub.dataUsageRx,
        dataUsageTx: mobileTrafficStub.dataUsageTx,
      })
    })

    it('getActualData-4: returning null values when last doc not found', async () => {
      const billingDate = '2023-01-18'
      jest
        .spyOn(deviceMobileTrafficModelMock, 'findOne')
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return null
            },
          }
        })

      const mobileTraffic = await service.getActualData(
        imei,
        billingDate,
        requestId,
      )
      expect(loggerService.warn).toBeCalledWith({
        message:
          'Failed to find the last mobile traffic document, returning null value instead',
        method: 'getActualData',
        imei,
        requestId,
      })
      expect(mobileTraffic).toEqual(null)
    })

    it('getActualData-5: returning current value when last doc parameter is less than the last doc before last billing date', async () => {
      const billingDate = '2023-01-18'
      const lastMobileTrafficBeforeTheBillingDate = {
        dataUsageRx: 13,
        dataUsageTx: 2,
        imei,
        createdDate: '2023-01-17',
        updatedAt: new Date('2023-01-17T13:44:53.245Z'),
      }
      jest
        .spyOn(deviceMobileTrafficModelMock, 'findOne')
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return mobileTrafficStub
            },
          }
        })
        .mockImplementationOnce((): any => {
          return {
            exec: () => {
              return lastMobileTrafficBeforeTheBillingDate
            },
          }
        })

      const mobileTraffic = await service.getActualData(
        imei,
        billingDate,
        requestId,
      )
      expect(mobileTraffic).toEqual({
        dataUsageRx: mobileTrafficStub.dataUsageRx,
        dataUsageTx:
          mobileTrafficStub.dataUsageTx -
          lastMobileTrafficBeforeTheBillingDate.dataUsageTx,
      })
    })
  })

  describe('getHistory', () => {
    it('getHistory-1 - should return an array of documents for specific imei', async () => {
      jest
        .spyOn(deviceMobileTrafficModelMock, 'find')
        .mockImplementation((): any => {
          return {
            exec: () => {
              return DeviceMobileTrafficHistoryStub()
            },
          }
        })
      const mobileTrafficHistory = await service.getHistory(imei, requestId)
      expect(mobileTrafficHistory).toEqual(DeviceMobileTrafficHistoryStub())
    })

    it('getHistory-2 - should log warning and return empty array in case of mobile traffic history not found for the imei', async () => {
      jest
        .spyOn(deviceMobileTrafficModelMock, 'find')
        .mockImplementation((): any => {
          return {
            exec: () => {
              return []
            },
          }
        })
      const mobileTrafficHistory = await service.getHistory(imei, requestId)
      expect(loggerService.warn).toBeCalledWith({
        message: 'Mobile traffic history not found',
        method: 'getHistory',
        imei,
        requestId,
      })
      expect(mobileTrafficHistory).toEqual([])
    })
  })
})
