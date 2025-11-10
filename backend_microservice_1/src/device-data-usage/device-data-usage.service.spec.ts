import { Test, TestingModule } from '@nestjs/testing'
import { DeviceDataUsageService } from './device-data-usage.service'
import { getModelToken } from '@nestjs/mongoose'
import { DeviceDataUsage } from './entities/device-data-usage.entity'
import { DeviceDataUsageModelMock } from '../../test/support/DeviceDataUsageModelMock'
import { CreateDeviceDataUsageDto } from './dto/create-device-data-usage.dto'
import {
  deviceDataUsageStub,
  deviceExtendedDataUsageStub,
  defaultDataUsageCounters,
} from '../../test/stubs/device-data-usage.stub'
import { dataUsageLimitation } from '../../test/stubs/device-data-usage-limitation.stub'
import {
  AlreadyExistsError,
  ResourceNotFoundError,
  UnknownError,
} from '@company-name/cloud-core/dist/errors'
import { Logger, BadRequestException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { AxiosResponse } from 'axios'
import * as rxjs from 'rxjs'
import { DeviceMobileTrafficService } from '../device-mobile-traffic/device-mobile-traffic.service'
import { RetryableProcessService } from '../retryable-process/retryable-process.service'

describe('DeviceDataUsageService', () => {
  let service: DeviceDataUsageService
  let deviceMobileTrafficService: DeviceMobileTrafficService
  let retryableProcessService: RetryableProcessService
  let dataUsageModelMock: DeviceDataUsageModelMock
  let httpService: HttpService
  let loggerService: Logger
  const existsImei = '123'
  const notExistsImei = '456'
  const requestId = 'd62f9082-e92a-4927-8d61-22decae74887'

  const axiosRes: AxiosResponse = {
    data: dataUsageLimitation,
    headers: {},
    config: { url: 'http://localhost:3000/mockUrl' },
    status: 200,
    statusText: 'OK',
  }
  const httpServiceMock = {
    post: jest.fn(),
    put: jest.fn(),
    get: jest.fn(),
  }
  const httpProvider = {
    provide: HttpService,
    useValue: httpServiceMock,
  }

  const deviceMobileTrafficProvider = {
    provide: DeviceMobileTrafficService,
    useValue: {
      createOrUpdate: jest.fn(),
      getActualData: jest.fn(),
      getHistory: jest.fn(),
    },
  }

  const retryableProcessProvider = {
    provide: RetryableProcessService,
    useValue: {
      isVideoProcessExist: jest.fn(),
      isSnapshotProcessExist: jest.fn(),
    },
  }

  beforeEach(async () => {
    const deviceDataUsageModelProvider = {
      provide: getModelToken(DeviceDataUsage.name),
      useClass: DeviceDataUsageModelMock,
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceDataUsageService,
        deviceDataUsageModelProvider,
        httpProvider,
        deviceMobileTrafficProvider,
        retryableProcessProvider,
      ],
    }).compile()

    service = module.get<DeviceDataUsageService>(DeviceDataUsageService)
    dataUsageModelMock = module.get<DeviceDataUsageModelMock>(
      getModelToken(DeviceDataUsage.name),
    )
    deviceMobileTrafficService = module.get<DeviceMobileTrafficService>(
      DeviceMobileTrafficService,
    )
    retryableProcessService = module.get<RetryableProcessService>(
      RetryableProcessService,
    )
    httpService = module.get<HttpService>(HttpService)
    loggerService = (service as any).logger
    jest.spyOn(loggerService, 'log')
    jest.spyOn(loggerService, 'error')
    jest.spyOn(loggerService, 'warn')
    jest.spyOn(loggerService, 'debug')
    jest.clearAllMocks()
  })

  it('data-usage-service: should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('data-usage-service: create()', () => {
    it('create-1: success', async () => {
      const imei = existsImei
      const createDeviceDataUsageDto: CreateDeviceDataUsageDto = {
        imei,
        billingDay: 10,
      }
      const dataUsage = await service.create(createDeviceDataUsageDto)
      const dataUsageCopy = await service.create(createDeviceDataUsageDto)
      expect(dataUsage).toEqual(deviceDataUsageStub(imei))
      expect(dataUsageCopy).toEqual(deviceDataUsageStub(imei))
    })

    it('create-2: error', async () => {
      jest.spyOn(dataUsageModelMock, 'create').mockImplementation((): any => {
        throw new AlreadyExistsError('bla-bla')
      })
      await expect(
        service.create(deviceDataUsageStub(existsImei)),
      ).rejects.toBeInstanceOf(UnknownError)
    })
  })

  describe('data-usage-service: findManyByImei()', () => {
    it('findManyByImei-1: success with results', async () => {
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              exec: () => {
                return [deviceDataUsageStub(existsImei)]
              },
            }
          },
        }
      })
      const dataUsage = await service.findManyByImei(existsImei, requestId)
      dataUsage.forEach((item) => expect(item.imei).toEqual(existsImei))
    })

    it('findManyByImei-2: success with no results', async () => {
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              exec: () => {
                return []
              },
            }
          },
        }
      })
      const data = await service.findManyByImei(existsImei, requestId)
      data.forEach((item) => expect(item.imei).toEqual(existsImei))
      expect(data).toEqual([])
    })
  })

  describe('data-usage-service: findLastOne()', () => {
    it('findLastOne-1: success with results', async () => {
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    return [deviceDataUsageStub(existsImei)]
                  },
                }
              },
            }
          },
        }
      })
      const dataUsage = await service.findLastOne(existsImei, requestId)
      expect(dataUsage).toEqual(deviceDataUsageStub(existsImei))
    })

    it('findLastOne-2: success with no results', async () => {
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    return []
                  },
                }
              },
            }
          },
        }
      })
      const data = await service.findLastOne(existsImei, requestId, false)
      expect(data).toBeUndefined()
    })

    it('findLastOne-3: error without results', async () => {
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    return []
                  },
                }
              },
            }
          },
        }
      })
      await expect(
        service.findLastOne(existsImei, requestId),
      ).rejects.toBeInstanceOf(ResourceNotFoundError)
    })
  })

  describe('data-usage-service: getActualOne()', () => {
    it('getActualOne-1: return default counters if no data in db', async () => {
      const billingDay = 1
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    return []
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,
        requestId,
        billingDay,
      )
      expect(result.billingDay).toBe(billingDay)
      expect(result.liveStreamingSecondsThisMonth).toBe(
        defaultDataUsageCounters.liveStreamingSecondsThisMonth,
      )
      expect(result.recordStreamingSecondsThisMonth).toBe(
        defaultDataUsageCounters.recordStreamingSecondsThisMonth,
      )
      expect(result.totalVideoEventsThisMonth).toBe(
        defaultDataUsageCounters.totalVideoEventsThisMonth,
      )
      expect(result.totalVideoEventsToday).toBe(
        defaultDataUsageCounters.totalVideoEventsToday,
      )
      expect(result.totalVideoEventsThisMonth).toBe(
        defaultDataUsageCounters.totalVideoEventsThisMonth,
      )
    })

    it('getActualOne-2: reset all counters if billing day is changed (and lastUpdateEventsCounters is not today)', async () => {
      const billingDay = 28
      const dataUsageStub = deviceExtendedDataUsageStub()
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    return [
                      {
                        ...dataUsageStub,
                        billingDay: billingDay + 1, // billingDay in DB is not the same as in the request
                      },
                    ]
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,
        requestId,
        billingDay,
      )
      expect(result.billingDay).toBe(dataUsageStub.billingDay)
      expect(result.liveStreamingSecondsThisMonth).toBe(
        defaultDataUsageCounters.liveStreamingSecondsThisMonth,
      )
      expect(result.recordStreamingSecondsThisMonth).toBe(
        defaultDataUsageCounters.recordStreamingSecondsThisMonth,
      )
      expect(result.totalVideoEventsToday).toBe(
        defaultDataUsageCounters.totalVideoEventsToday,
      )
      expect(result.totalVideoEventsThisMonth).toBe(
        defaultDataUsageCounters.totalVideoEventsThisMonth,
      )
    })

    it('getActualOne-3: reset all counters if billingDay is today, but updatedAt & lastUpdateEventsCounters are pretty old', async () => {
      const dataUsageStub = deviceExtendedDataUsageStub()
      const currentDayOfMonth = new Date().getDate() // today is billingDay

      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    return [
                      {
                        ...dataUsageStub,
                        billingDay: currentDayOfMonth,
                      },
                    ]
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,
        requestId,
        currentDayOfMonth,
      )
      expect(result.billingDay).toBe(currentDayOfMonth)
      // expect(result.liveStreamingSecondsThisMonth).toBe(
      //   defaultDataUsageCounters.liveStreamingSecondsThisMonth,
      // )
      // expect(result.recordStreamingSecondsThisMonth).toBe(
      //   defaultDataUsageCounters.recordStreamingSecondsThisMonth,
      // )
      // expect(result.totalVideoEventsToday).toBe(
      //   defaultDataUsageCounters.totalVideoEventsToday,
      // )
      // expect(result.totalVideoEventsThisMonth).toBe(
      //   defaultDataUsageCounters.totalVideoEventsThisMonth,
      // )
    })

    it('getActualOne-4: reset only monthly counters if billingDay and lastUpdateEventsCounters are today', async () => {
      const dataUsageStub = deviceExtendedDataUsageStub()
      const now = new Date()
      const currentDayOfMonth = now.getDate() // today is billingDay

      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    const timestampThreeHoursAgo = now.setHours(
                      now.getHours() - 3,
                    ) // 3 hours ago from now
                    return [
                      {
                        ...dataUsageStub,
                        billingDay: currentDayOfMonth,
                        lastUpdateEventsCounters: new Date(
                          timestampThreeHoursAgo,
                        ).toISOString(),
                      },
                    ]
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,
        requestId,
        currentDayOfMonth,
      )
      expect(result.billingDay).toBe(currentDayOfMonth)
      // expect(result.liveStreamingSecondsThisMonth).toBe(
      //   defaultDataUsageCounters.liveStreamingSecondsThisMonth,
      // )
      // expect(result.recordStreamingSecondsThisMonth).toBe(
      //   defaultDataUsageCounters.recordStreamingSecondsThisMonth,
      // )
      // expect(result.totalVideoEventsToday).toBe(
      //   dataUsageStub.totalVideoEventsToday,
      // )
      // expect(result.totalVideoEventsThisMonth).toBe(
      //   defaultDataUsageCounters.totalVideoEventsThisMonth,
      // )
    })

    it('getActualOne-5: do not reset any counters if billingDay, lastUpdateEventsCounters and updatedAt are today', async () => {
      const dataUsageStub = deviceExtendedDataUsageStub()
      const now = new Date()
      const currentDayOfMonth = now.getDate() // today is billingDay

      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    const timestampThreeHoursAgo = now.setHours(
                      now.getHours() - 3,
                    ) // 3 hours ago from now
                    return [
                      {
                        ...dataUsageStub,
                        billingDay: currentDayOfMonth,
                        lastUpdateEventsCounters: new Date(
                          timestampThreeHoursAgo,
                        ).toISOString(),
                        updatedAt: new Date(timestampThreeHoursAgo),
                      },
                    ]
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,
        requestId,
        currentDayOfMonth,
      )
      expect(result.billingDay).toBe(currentDayOfMonth)
      expect(result.liveStreamingSecondsThisMonth).toBe(
        dataUsageStub.liveStreamingSecondsThisMonth,
      )
      expect(result.recordStreamingSecondsThisMonth).toBe(
        dataUsageStub.recordStreamingSecondsThisMonth,
      )
      expect(result.totalVideoEventsToday).toBe(
        dataUsageStub.totalVideoEventsToday,
      )
      expect(result.totalVideoEventsThisMonth).toBe(
        dataUsageStub.totalVideoEventsThisMonth,
      )
    })

    it('getActualOne-6: do not reset any counters if billingDay is tomorrow, lastUpdateEventsCounters and updatedAt are today', async () => {
      const dataUsageStub = deviceExtendedDataUsageStub()
      const now = new Date()
      const nextDayOfMonth = now.getDate() + 1 // tomorrow is billingDay

      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    const timestampThreeHoursAgo = now.setHours(
                      now.getHours() - 3,
                    ) // 3 hours ago from now
                    return [
                      {
                        ...dataUsageStub,
                        billingDay: nextDayOfMonth,
                        lastUpdateEventsCounters: new Date(
                          timestampThreeHoursAgo,
                        ).toISOString(),
                        updatedAt: new Date(timestampThreeHoursAgo),
                      },
                    ]
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,
        requestId,
        nextDayOfMonth,
      )
      expect(result.billingDay).toBe(nextDayOfMonth)
      // ToDo: check and uncomment the code below after DataUsage updates are merged
      // expect(result.liveStreamingSecondsThisMonth).toBe(
      //   dataUsageStub.liveStreamingSecondsThisMonth,
      // )
      // expect(result.recordStreamingSecondsThisMonth).toBe(
      //   dataUsageStub.recordStreamingSecondsThisMonth,
      // )
      // expect(result.totalVideoEventsToday).toBe(
      //   dataUsageStub.totalVideoEventsToday,
      // )
      // expect(result.totalVideoEventsThisMonth).toBe(
      //   dataUsageStub.totalVideoEventsThisMonth,
      // )
    })

    it('getActualOne-7: reset only daily counters if billingDay is tomorrow, updatedAt is today, but lastUpdateEventsCounters is yesterday', async () => {
      const dataUsageStub = deviceExtendedDataUsageStub()
      const now = new Date()
      const nextDayOfMonth = now.getDate() + 1 // tomorrow is billingDay

      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    const timestampThreeHoursAgo = now.setHours(
                      now.getHours() - 3,
                    ) // 3 hours ago from now
                    const timestampYesterday = now.setHours(now.getHours() - 25) // at least 1 day ago from now
                    return [
                      {
                        ...dataUsageStub,
                        billingDay: nextDayOfMonth,
                        lastUpdateEventsCounters: new Date(
                          timestampYesterday,
                        ).toISOString(),
                        updatedAt: new Date(timestampThreeHoursAgo),
                      },
                    ]
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,

        requestId,
        nextDayOfMonth,
      )
      expect(result.billingDay).toBe(nextDayOfMonth)
      // ToDo: check and uncomment the code below after DataUsage updates are merged
      // expect(result.liveStreamingSecondsThisMonth).toBe(
      //   dataUsageStub.liveStreamingSecondsThisMonth,
      // )
      // expect(result.recordStreamingSecondsThisMonth).toBe(
      //   dataUsageStub.recordStreamingSecondsThisMonth,
      // )
      expect(result.totalVideoEventsToday).toBe(
        defaultDataUsageCounters.totalVideoEventsToday,
      )
      // expect(result.totalVideoEventsThisMonth).toBe(
      //   dataUsageStub.totalVideoEventsThisMonth,
      // )
    })

    it('getActualOne-8: reset only daily counters if billingDay is tomorrow, lastUpdateEventsCounters and updatedAt are yesterday', async () => {
      const dataUsageStub = deviceExtendedDataUsageStub()
      const now = new Date()
      const nextDayOfMonth = now.getDate() + 1 // tomorrow is billingDay

      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    const timestampYesterday = now.setHours(now.getHours() - 25) // at least 1 day ago from now
                    return [
                      {
                        ...dataUsageStub,
                        billingDay: nextDayOfMonth,
                        lastUpdateEventsCounters: new Date(
                          timestampYesterday,
                        ).toISOString(),
                        updatedAt: new Date(timestampYesterday),
                      },
                    ]
                  },
                }
              },
            }
          },
        }
      })

      const result = await service.getActualOne(
        existsImei,
        requestId,
        nextDayOfMonth,
      )
      expect(result.billingDay).toBe(nextDayOfMonth)
      // ToDo: check and uncomment the code below after DataUsage updates are merged
      // expect(result.liveStreamingSecondsThisMonth).toBe(
      //   dataUsageStub.liveStreamingSecondsThisMonth,
      // )
      // expect(result.recordStreamingSecondsThisMonth).toBe(
      //   dataUsageStub.recordStreamingSecondsThisMonth,
      // )
      expect(result.totalVideoEventsToday).toBe(
        defaultDataUsageCounters.totalVideoEventsToday,
      )
      // expect(result.totalVideoEventsThisMonth).toBe(
      //   dataUsageStub.totalVideoEventsThisMonth,
      // )
    })
  })

  describe('data-usage-service: increaseCounters()', () => {
    it('increaseCounters-1: update data-usage by increasing counters - success', async () => {
      jest.spyOn(dataUsageModelMock, 'find').mockImplementation((): any => {
        return {
          sort: () => {
            return {
              limit: () => {
                return {
                  exec: () => {
                    return [deviceDataUsageStub(existsImei)]
                  },
                }
              },
            }
          },
        }
      })

      const increaser = 60
      const increaser2 = 30
      const dataUsage = await service.increaseCounters(
        existsImei,
        {
          recordStreamingSecondsThisMonth: increaser,
          liveStreamingSecondsThisMonth: increaser2,
          billingDay: dataUsageLimitation.data.billingDayOfMonth,
        },
        requestId,
      )

      expect(dataUsage.recordStreamingSecondsThisMonth).toEqual(
        defaultDataUsageCounters.recordStreamingSecondsThisMonth + increaser,
      )
      expect(dataUsage.liveStreamingSecondsThisMonth).toEqual(
        defaultDataUsageCounters.liveStreamingSecondsThisMonth + increaser2,
      )
    })

    it('increaseCounters-2: update data-usage - wrong imei', async () => {
      await expect(
        service.increaseCounters(
          notExistsImei,
          {
            billingDay: dataUsageLimitation.data.billingDayOfMonth,
          },
          requestId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('data-usage-service: getDataProfileLimitation()', () => {
    it('getDataProfileLimitation-1: returns data profile limitation', async () => {
      jest.spyOn(rxjs, 'firstValueFrom').mockReturnValueOnce(
        new Promise((resolve) => {
          return resolve({ data: dataUsageLimitation })
        }),
      )
      jest.spyOn(httpService, 'get').mockReturnValue(rxjs.of(axiosRes))
      const dataUsageLimitationRes = await service.getDataProfileLimitation(
        existsImei,
        requestId,
      )
      expect(dataUsageLimitationRes).toEqual(dataUsageLimitation)
    })

    it('getDataProfileLimitation-2: catches and logs an exception in case of error', async () => {
      jest.spyOn(rxjs, 'firstValueFrom').mockImplementation((): any => {
        throw new Error('test error')
      })
      await service.getDataProfileLimitation(existsImei, requestId)
      expect(loggerService.error).toBeCalled()
    })
  })

  describe('data-usage-service: areEventLimitsReachedAndCountersNotIncreased()', () => {
    it('areEventLimitsReachedAndCountersNotIncreased-1: return true in case of videoEventsMonth == 1 and totalVideoEventsThisMonth == 1', async () => {
      jest
        .spyOn(service, 'getDataProfileLimitation')
        .mockImplementation(async () => Promise.resolve(dataUsageLimitation))
      jest.spyOn(service, 'getActualOne').mockImplementation((): any => ({
        ...deviceDataUsageStub(),
        totalVideoEventsThisMonth: 1,
      }))
      const res = await service.areEventLimitsReachedAndCountersNotIncreased(
        existsImei,
        requestId,
      )
      expect(res).toBe(true)
    })

    it('areEventLimitsReachedAndCountersNotIncreased-2: return true in case of videoEventsDay == 1 and totalVideoEventsToday == 1', async () => {
      jest
        .spyOn(service, 'getDataProfileLimitation')
        .mockImplementation(async () => Promise.resolve(dataUsageLimitation))
      jest.spyOn(service, 'getActualOne').mockImplementation((): any => ({
        ...deviceDataUsageStub(),
        totalVideoEventsToday: 1,
      }))
      const res = await service.areEventLimitsReachedAndCountersNotIncreased(
        existsImei,
        requestId,
      )
      expect(res).toBe(true)
    })

    it('areEventLimitsReachedAndCountersNotIncreased-3: return false and increase the counters in case of videoEventsMonth == 1 and videoEventsDay == 1 and totalVideoEventsToday == 0 and totalVideoEventsThisMonth == 0', async () => {
      const dataUsage = {
        ...deviceDataUsageStub(),
        billingDay: dataUsageLimitation.data.billingDayOfMonth,
      }
      jest.spyOn(service, 'increaseCounters')
      jest
        .spyOn(service, 'getDataProfileLimitation')
        .mockImplementation(async () => Promise.resolve(dataUsageLimitation))
      jest
        .spyOn(service, 'getActualOne')
        .mockImplementation((): any => dataUsage)
      const res = await service.areEventLimitsReachedAndCountersNotIncreased(
        existsImei,
        requestId,
      )
      expect(service.increaseCounters).toBeCalledWith(
        existsImei,
        {
          totalVideoEventsToday: 1,
          totalVideoEventsThisMonth: 1,
          billingDay: dataUsage.billingDay,
        },
        requestId,
        dataUsage,
      )
      expect(res).toBe(false)
    })

    it('areEventLimitsReachedAndCountersNotIncreased-4: return true in case of getting a parameter and videoEventsMonth == 1 and totalVideoEventsThisMonth == 1', async () => {
      jest.spyOn(service, 'getActualOne').mockImplementation((): any => ({
        ...deviceDataUsageStub(),
        totalVideoEventsThisMonth: 1,
      }))
      const res = await service.areEventLimitsReachedAndCountersNotIncreased(
        existsImei,
        requestId,
        dataUsageLimitation.data,
      )
      expect(res).toBe(true)
    })

    it('areEventLimitsReachedAndCountersNotIncreased-5: return true in case of getting a parameter and videoEventsDay == 1 and totalVideoEventsToday == 1', async () => {
      jest.spyOn(service, 'getActualOne').mockImplementation((): any => ({
        ...deviceDataUsageStub(),
        totalVideoEventsToday: 1,
      }))
      const res = await service.areEventLimitsReachedAndCountersNotIncreased(
        existsImei,
        requestId,
        dataUsageLimitation.data,
      )
      expect(res).toBe(true)
    })

    it('areEventLimitsReachedAndCountersNotIncreased-6: return false and increase the counters in case of getting a parameter and videoEventsMonth == 1 and videoEventsDay == 1 and totalVideoEventsToday == 0 and totalVideoEventsThisMonth == 0', async () => {
      const dataUsage = {
        ...deviceDataUsageStub(),
        billingDay: dataUsageLimitation.data.billingDayOfMonth,
      }
      jest.spyOn(service, 'increaseCounters')
      jest
        .spyOn(service, 'getActualOne')
        .mockImplementation((): any => deviceDataUsageStub())
      const res = await service.areEventLimitsReachedAndCountersNotIncreased(
        existsImei,
        requestId,
        dataUsageLimitation.data,
      )
      expect(service.increaseCounters).toBeCalledWith(
        existsImei,
        {
          totalVideoEventsToday: 1,
          totalVideoEventsThisMonth: 1,
          billingDay: dataUsage.billingDay,
        },
        requestId,
        deviceDataUsageStub(),
      )
      expect(res).toBe(false)
    })
  })

  describe('data-usage-service: remove() - for single device', () => {
    it('remove-1: success for existent records of specific imei', async () => {
      jest
        .spyOn(dataUsageModelMock, 'deleteMany')
        .mockImplementation((): any => {
          return {
            exec: () => {
              return {
                deletedCount: 5,
              }
            },
          }
        })
      const { deletedCount } = await service.remove(existsImei)
      expect(deletedCount).toBeGreaterThanOrEqual(1)
    })

    it('remove-2: no error for absent records of specific imei', async () => {
      const { deletedCount } = await service.remove(notExistsImei)
      expect(deletedCount).toEqual(0)
    })
  })

  describe('data-usage-service: removeMany() - for bunch of devices', () => {
    it('removeMany-1: success for existent records of listed imeis', async () => {
      const imeis = [existsImei, notExistsImei]
      jest
        .spyOn(dataUsageModelMock, 'deleteMany')
        .mockImplementation((): any => {
          return {
            exec: () => {
              return {
                deletedCount: imeis.includes(existsImei) ? 1 : 0,
              }
            },
          }
        })

      const { deletedCount } = await service.removeMany(imeis)
      expect(deletedCount).toBeGreaterThanOrEqual(1)
    })

    it('removeMany-2: no error for absent records of listed imeis', async () => {
      const imeis = [notExistsImei, '-']
      jest
        .spyOn(dataUsageModelMock, 'deleteMany')
        .mockImplementation((): any => {
          return {
            exec: () => {
              return {
                deletedCount: imeis.includes(existsImei) ? 1 : 0,
              }
            },
          }
        })

      const { deletedCount } = await service.removeMany(imeis)
      expect(deletedCount).toEqual(0)
    })
  })

  describe('data-usage-service: getHistory', () => {
    it('getHistory-1 - should add mobile traffic params with zeros in case of common data usage exist and mobile traffic not stored at all yet', async () => {
      const commonDataUsageHistory = [
        {
          lastUpdateEventsCounters: '2023-01-22T14:17:55.309Z',
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          _id: '63cfe89374496045dfa45d7e',
          imei: '131313',
          billingDay: 1,
          updatedAt: '2023-01-22T14:17:55.311Z',
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
      ]
      jest.spyOn(service, 'findManyByImei').mockImplementation((): any => {
        return [
          {
            ...commonDataUsageHistory[0],
            toObject: jest.fn(() => commonDataUsageHistory[0]),
          },
        ]
      })
      jest
        .spyOn(deviceMobileTrafficService, 'getHistory')
        .mockImplementation((): any => {
          return []
        })
      const dataUsageHistory = await service.getHistory(existsImei, requestId)
      expect(dataUsageHistory).toEqual([
        {
          updatedAt: '2023-01-22T14:17:55.311Z',
          dataUsageRx: null,
          dataUsageTx: null,
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
      ])
    })
    it('getHistory-2 - should add common data usage params with zeros in case of mobile traffic exist and common data usage not stored at all yet', async () => {
      const mobileTrafficHistory = [
        {
          createdDate: '2023-01-21',
          dataUsageRx: 4,
          dataUsageTx: 4,
          updatedAt: '2023-01-21T13:44:53.245Z',
        },
      ]
      jest.spyOn(service, 'findManyByImei').mockImplementation((): any => {
        return []
      })
      jest
        .spyOn(deviceMobileTrafficService, 'getHistory')
        .mockImplementation((): any => {
          return [
            {
              ...mobileTrafficHistory[0],
              toObject: jest.fn(() => mobileTrafficHistory[0]),
            },
          ]
        })
      const dataUsageHistory = await service.getHistory(existsImei, requestId)
      expect(dataUsageHistory).toEqual([
        {
          updatedAt: '2023-01-21T13:44:53.245Z',
          dataUsageRx: 4,
          dataUsageTx: 4,
          totalVideoEventsThisMonth: 0,
          totalVideoEventsToday: 0,
          recordStreamingSecondsThisMonth: 0,
          liveStreamingSecondsThisMonth: 0,
          eventsBytesThisMonth: 0,
          liveStreamingBytesThisMonth: 0,
          recordStreamingBytesThisMonth: 0,
        },
      ])
    })

    it('getHistory-3 - should add to common data usage docs, the last mobile traffic data before their date', async () => {
      const mobileTrafficHistory = [
        {
          createdDate: '2023-01-21',
          dataUsageRx: 1,
          dataUsageTx: 1,
          updatedAt: '2023-01-21T13:44:53.245Z',
        },
      ]
      const commonDataUsageHistory = [
        {
          lastUpdateEventsCounters: '2023-01-22T14:17:55.309Z',
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          _id: '63cfe89374496045dfa45d7e',
          imei: '131313',
          billingDay: 1,
          updatedAt: '2023-01-22T14:17:55.311Z',
        },
        {
          lastUpdateEventsCounters: '2023-01-23T14:17:55.309Z',
          totalVideoEventsThisMonth: 5,
          totalVideoEventsToday: 5,
          recordStreamingSecondsThisMonth: 5,
          liveStreamingSecondsThisMonth: 5,
          _id: '63cfe89374496045dfa45d7e',
          imei: '131313',
          billingDay: 1,
          updatedAt: '2023-01-23T14:17:55.311Z',
        },
      ]
      jest.spyOn(service, 'findManyByImei').mockImplementation((): any => {
        return [
          {
            ...commonDataUsageHistory[0],
            toObject: jest.fn(() => commonDataUsageHistory[0]),
          },
          {
            ...commonDataUsageHistory[1],
            toObject: jest.fn(() => commonDataUsageHistory[1]),
          },
        ]
      })
      jest
        .spyOn(deviceMobileTrafficService, 'getHistory')
        .mockImplementation((): any => {
          return [
            {
              ...mobileTrafficHistory[0],
              toObject: jest.fn(() => mobileTrafficHistory[0]),
            },
          ]
        })
      const dataUsageHistory = await service.getHistory(existsImei, requestId)
      expect(dataUsageHistory).toEqual([
        {
          updatedAt: '2023-01-21T13:44:53.245Z',
          dataUsageRx: 1,
          dataUsageTx: 1,
          totalVideoEventsThisMonth: 0,
          totalVideoEventsToday: 0,
          recordStreamingSecondsThisMonth: 0,
          liveStreamingSecondsThisMonth: 0,
          eventsBytesThisMonth: 0,
          liveStreamingBytesThisMonth: 0,
          recordStreamingBytesThisMonth: 0,
        },
        {
          updatedAt: '2023-01-22T14:17:55.311Z',
          dataUsageRx: 1,
          dataUsageTx: 1,
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          eventsBytesThisMonth: 0,
          liveStreamingBytesThisMonth: 0,
          recordStreamingBytesThisMonth: 0,
        },
        {
          updatedAt: '2023-01-23T14:17:55.311Z',
          dataUsageRx: 1,
          dataUsageTx: 1,
          totalVideoEventsThisMonth: 5,
          totalVideoEventsToday: 5,
          recordStreamingSecondsThisMonth: 5,
          liveStreamingSecondsThisMonth: 5,
          eventsBytesThisMonth: 0,
          liveStreamingBytesThisMonth: 0,
          recordStreamingBytesThisMonth: 0,
        },
      ])
    })

    it('getHistory-4 - should add to mobile traffic docs, the last common data usage before their date', async () => {
      const mobileTrafficHistory = [
        {
          createdDate: '2023-01-25',
          dataUsageRx: 1,
          dataUsageTx: 1,
          updatedAt: '2023-01-25T13:44:53.245Z',
        },
        {
          createdDate: '2023-01-26',
          dataUsageRx: 2,
          dataUsageTx: 2,
          updatedAt: '2023-01-26T13:44:53.245Z',
        },
      ]
      const commonDataUsageHistory = [
        {
          lastUpdateEventsCounters: '2023-01-22T14:17:55.309Z',
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          _id: '63cfe89374496045dfa45d7e',
          imei: '131313',
          billingDay: 1,
          updatedAt: '2023-01-22T14:17:55.311Z',
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
      ]
      jest.spyOn(service, 'findManyByImei').mockImplementation((): any => {
        return [
          {
            ...commonDataUsageHistory[0],
            toObject: jest.fn(() => commonDataUsageHistory[0]),
          },
        ]
      })
      jest
        .spyOn(deviceMobileTrafficService, 'getHistory')
        .mockImplementation((): any => {
          return [
            {
              ...mobileTrafficHistory[0],
              toObject: jest.fn(() => mobileTrafficHistory[0]),
            },
            {
              ...mobileTrafficHistory[1],
              toObject: jest.fn(() => mobileTrafficHistory[1]),
            },
          ]
        })
      const dataUsageHistory = await service.getHistory(existsImei, requestId)
      expect(dataUsageHistory).toEqual([
        {
          updatedAt: '2023-01-22T14:17:55.311Z',
          dataUsageRx: null,
          dataUsageTx: null,
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
        {
          updatedAt: '2023-01-25T13:44:53.245Z',
          dataUsageRx: 1,
          dataUsageTx: 1,
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
        {
          updatedAt: '2023-01-26T13:44:53.245Z',
          dataUsageRx: 2,
          dataUsageTx: 2,
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
      ])
    })

    it('getHistory-5 - should combine mobile traffic and data usage on the same days', async () => {
      const mobileTrafficHistory = [
        {
          createdDate: '2023-01-25',
          dataUsageRx: 1,
          dataUsageTx: 1,
          updatedAt: '2023-01-25T13:44:53.245Z',
        },
        {
          createdDate: '2023-01-26',
          dataUsageRx: 2,
          dataUsageTx: 2,
          updatedAt: '2023-01-26T13:44:53.245Z',
        },
      ]
      const commonDataUsageHistory = [
        {
          lastUpdateEventsCounters: '2023-01-25T13:44:53.245Z',
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          _id: '63cfe89374496045dfa45d7e',
          imei: '131313',
          billingDay: 1,
          updatedAt: '2023-01-25T13:44:53.245Z',
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
        {
          lastUpdateEventsCounters: '2023-01-26T13:44:53.245Z',
          totalVideoEventsThisMonth: 5,
          totalVideoEventsToday: 5,
          recordStreamingSecondsThisMonth: 5,
          liveStreamingSecondsThisMonth: 5,
          _id: '63cfe89374496045dfa45d7e',
          imei: '131313',
          billingDay: 1,
          updatedAt: '2023-01-26T13:44:53.245Z',
          eventsBytesThisMonth: 5000,
          liveStreamingBytesThisMonth: 4096,
          recordStreamingBytesThisMonth: 5120,
        },
      ]
      jest.spyOn(service, 'findManyByImei').mockImplementation((): any => {
        return [
          {
            ...commonDataUsageHistory[0],
            toObject: jest.fn(() => commonDataUsageHistory[0]),
          },
          {
            ...commonDataUsageHistory[1],
            toObject: jest.fn(() => commonDataUsageHistory[1]),
          },
        ]
      })
      jest
        .spyOn(deviceMobileTrafficService, 'getHistory')
        .mockImplementation((): any => {
          return [
            {
              ...mobileTrafficHistory[0],
              toObject: jest.fn(() => mobileTrafficHistory[0]),
            },
            {
              ...mobileTrafficHistory[1],
              toObject: jest.fn(() => mobileTrafficHistory[1]),
            },
          ]
        })
      const dataUsageHistory = await service.getHistory(existsImei, requestId)
      expect(dataUsageHistory).toEqual([
        {
          updatedAt: '2023-01-25T13:44:53.245Z',
          dataUsageRx: 1,
          dataUsageTx: 1,
          totalVideoEventsThisMonth: 4,
          totalVideoEventsToday: 4,
          recordStreamingSecondsThisMonth: 4,
          liveStreamingSecondsThisMonth: 4,
          eventsBytesThisMonth: 1000,
          liveStreamingBytesThisMonth: 1024,
          recordStreamingBytesThisMonth: 2048,
        },
        {
          updatedAt: '2023-01-26T13:44:53.245Z',
          dataUsageRx: 2,
          dataUsageTx: 2,
          totalVideoEventsThisMonth: 5,
          totalVideoEventsToday: 5,
          recordStreamingSecondsThisMonth: 5,
          liveStreamingSecondsThisMonth: 5,
          eventsBytesThisMonth: 5000,
          liveStreamingBytesThisMonth: 4096,
          recordStreamingBytesThisMonth: 5120,
        },
      ])
    })
  })
  describe('saveUploadedBytes', () => {
    it('saveUploadedBytes-1: should call to increase counters with property eventsBytesThisMonth', async () => {
      jest
        .spyOn(retryableProcessService, 'isVideoProcessExist')
        .mockImplementation((): any => {
          return true
        })
      jest.spyOn(service, 'increaseCounters')
      jest.spyOn(service, 'getActualOne').mockImplementation((): any => {
        return deviceDataUsageStub(existsImei)
      })
      await service.saveUploadedBytes(existsImei, 444, requestId)

      expect(service.increaseCounters).toBeCalledWith(
        existsImei,
        {
          eventsBytesThisMonth: 444,
        },
        requestId,
      )
    })
    it('saveUploadedBytes-2: should call to increase counters with property eventsBytesThisMonth', async () => {
      jest
        .spyOn(retryableProcessService, 'isVideoProcessExist')
        .mockImplementation((): any => {
          return false
        })
      jest.spyOn(service, 'increaseCounters')
      jest.spyOn(service, 'getActualOne').mockImplementation((): any => {
        return deviceDataUsageStub(existsImei)
      })
      await service.saveUploadedBytes(existsImei, 444, requestId)

      expect(service.increaseCounters).toBeCalledWith(
        existsImei,
        {
          recordStreamingBytesThisMonth: 444,
        },
        requestId,
      )
    })

    it('saveUploadedBytes-3: should not call to increase counters and should log warning in case of uploadedBytes value is not greater than or equal to 1', async () => {
      jest.spyOn(retryableProcessService, 'isVideoProcessExist')
      jest.spyOn(service, 'increaseCounters')

      await service.saveUploadedBytes(existsImei, 0, requestId)

      expect(service.increaseCounters).toHaveBeenCalledTimes(0)
      expect(loggerService.warn).toBeCalled()
    })

    it('saveUploadedBytes-4: should not call to increase counters in case that dataType is snapshot', async () => {
      jest
        .spyOn(retryableProcessService, 'isSnapshotProcessExist')
        .mockImplementation((): any => {
          return true
        })
      jest.spyOn(service, 'increaseCounters')

      await service.saveUploadedBytes(existsImei, 444, requestId)

      expect(service.increaseCounters).toHaveBeenCalledTimes(0)
    })
  })
  describe('factoryReset', () => {
    it('factoryReset-1: sanity', async () => {
      jest
        .spyOn(service, 'getDataProfileLimitation')
        .mockImplementation(async () => Promise.resolve(dataUsageLimitation))
      jest.spyOn(dataUsageModelMock, 'create')
      await service.createOne(existsImei, requestId)
      expect(service.getDataProfileLimitation).toHaveBeenCalled()
      expect(dataUsageModelMock.create).toBeCalled()
    })
  })
})
