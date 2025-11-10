import { Test, TestingModule } from '@nestjs/testing'
import { EventConfigService } from './event-config.service'
import { getModelToken } from '@nestjs/mongoose'
import {
  EventConfigDocument,
  EventConfigEntity,
} from './schemas/event-config.schema'
import { EventConfigModelMock } from '../../test/support/event-config.model.mock'
import {
  eventConfigDataTypeSnapshotStub,
  eventConfigDataTypeVideoStub,
} from '../../test/stubs/event-config.stub'
import { GetBulkEventConfigDto } from './dto/get-bulk-event-config.dto'
import { CreateBulkEventConfigDto } from './dto/create-bulk-event-config.dto'
import { IAuditLogHeaders } from '@company-name/cloud-core/dist/interfaces/audit-logs'
import { KAFKA_CLIENT_TOKEN } from '../constants'
import * as utils from '@company-name/cloud-core/dist/utils'
import { ClientKafka } from '@nestjs/microservices'
import { Producer } from '@nestjs/microservices/external/kafka.interface'
import { Logger } from '@nestjs/common'

class LoggerMock extends Logger {
  info() {
    return undefined
  }
}

describe('EventConfigService', () => {
  let service: EventConfigService
  let eventConfigModelMock: EventConfigModelMock
  let clientKafka: ClientKafka
  let loggerService: LoggerMock
  const notExistImei = '-5'

  const auditLogHeaders: IAuditLogHeaders = {
    userId: 11,
    partnerId: null,
    partnerContactId: null,
    orgId: 22,
    originalEndPoint: '/endpoint',
  }

  beforeEach(async () => {
    class ClientProxyMock {
      connect() {
        return undefined
      }

      createClient() {
        return {
          admin: jest.fn().mockReturnValue({
            connect: jest.fn(),
            listTopics: jest.fn().mockReturnValue([]),
          }),
        }
      }

      send() {
        return undefined
      }

      emit() {
        return undefined
      }

      subscribeToResponseOf() {
        return undefined
      }
    }
    const ClientKafkaProvider = {
      provide: KAFKA_CLIENT_TOKEN,
      useClass: ClientProxyMock,
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientKafkaProvider,
        EventConfigService,
        {
          provide: getModelToken(EventConfigEntity.name),
          useClass: EventConfigModelMock,
        },
      ],
    }).compile()
    clientKafka = module.get<ClientKafka>(KAFKA_CLIENT_TOKEN)
    service = module.get<EventConfigService>(EventConfigService)
    eventConfigModelMock = module.get<
      EventConfigModelMock,
      EventConfigModelMock
    >(getModelToken(EventConfigEntity.name))
    jest.clearAllMocks()
    jest.spyOn(utils, 'publishOnAuditLogsTopic').mockImplementation()
    jest.spyOn((service as any).logger, 'error').mockImplementation()
    jest.spyOn((service as any).logger, 'log').mockImplementation()
    jest.spyOn((service as any).logger, 'debug').mockImplementation()
    jest.spyOn((service as any).logger, 'warn').mockImplementation()
    loggerService = (service as any).logger
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('onModuleInit', () => {
    jest.spyOn(utils, 'initializeKafkaClient').mockImplementation()
    it('onModuleInit should call to initializeKafkaClient', async () => {
      await service.onModuleInit()
      expect(utils.initializeKafkaClient).toBeCalledWith(
        clientKafka,
        (service as any).logger,
      )
    })
  })

  describe('getOne', () => {
    it('getOne-1: Get event config', async () => {
      const result = await service.getOne(
        eventConfigDataTypeSnapshotStub().imei,
      )
      expect(result).toMatchObject(eventConfigDataTypeSnapshotStub())
    })
    it('getOne-2: Should call to putOrCreate event config', async () => {
      jest
        .spyOn(eventConfigModelMock, 'findOne')
        .mockImplementation((): any => {
          return {
            exec: () => null,
          }
        })
      jest
        .spyOn(service, 'putOrCreate')
        .mockImplementation((): any => eventConfigDataTypeSnapshotStub())
      const result = await service.getOne(
        eventConfigDataTypeSnapshotStub().imei,
      )
      expect(service.putOrCreate).toBeCalled()
      expect(result).toMatchObject(eventConfigDataTypeSnapshotStub())
    })
  })

  it('event-config-2: Get all event configs - success ', async () => {
    const getBulkEventConfigDto = new GetBulkEventConfigDto()
    getBulkEventConfigDto.imeis = [eventConfigDataTypeSnapshotStub().imei]
    const result = await service.getBulkEventConfig(getBulkEventConfigDto)
    expect(result.length).toEqual(1)
    expect(result[0]).toMatchObject(eventConfigDataTypeSnapshotStub())
  })

  it('event-config-3: Get all event configs (empty) -  success ', async () => {
    jest.spyOn(eventConfigModelMock, 'find').mockImplementation((): any => {
      return {
        exec: () => null,
      }
    })
    const getBulkEventConfigDto = new GetBulkEventConfigDto()
    getBulkEventConfigDto.imeis = [eventConfigDataTypeSnapshotStub().imei]
    const result = await service.getBulkEventConfig(getBulkEventConfigDto)
    expect(result.length).toEqual(0)
  })

  it('event-config-4: create event config (with exists entity) -  success ', async () => {
    jest.spyOn(eventConfigModelMock, 'findOne').mockImplementation((): any => {
      return {
        exec: () => {
          return {
            ...eventConfigDataTypeSnapshotStub(),
            save: () => {
              return eventConfigDataTypeSnapshotStub()
            },
          }
        },
      }
    })
    jest.spyOn(service, 'logDeclaredUtils')
    const result = await service.putOrCreate(
      eventConfigDataTypeSnapshotStub().imei,
      eventConfigDataTypeSnapshotStub().triggers,
      '11111',
      auditLogHeaders,
    )
    expect(result).toMatchObject(eventConfigDataTypeSnapshotStub())
    expect(service.logDeclaredUtils).toBeCalled()
  })

  it('event-config-4.1: should publish audit log to kafka', async () => {
    jest.spyOn(eventConfigModelMock, 'findOne').mockImplementation((): any => {
      return {
        exec: () => {
          return {
            ...eventConfigDataTypeSnapshotStub(),
            save: () => {
              return eventConfigDataTypeSnapshotStub()
            },
          }
        },
      }
    })
    jest.spyOn(service, 'logDeclaredUtils')
    const result = await service.putOrCreate(
      eventConfigDataTypeSnapshotStub().imei,
      eventConfigDataTypeSnapshotStub().triggers,
      '11111',
      auditLogHeaders,
    )
    expect(utils.publishOnAuditLogsTopic).toBeCalled()
    expect(service.logDeclaredUtils).toBeCalled()
  })

  it('event-config-4.2: should publish audit log to kafka', async () => {
    jest.spyOn(eventConfigModelMock, 'findOne').mockImplementation((): any => {
      return {
        exec: () => {
          return {
            ...eventConfigDataTypeSnapshotStub(),
            save: () => {
              return eventConfigDataTypeSnapshotStub()
            },
          }
        },
      }
    })
    jest.spyOn(service, 'logDeclaredUtils')
    const result = await service.putOrCreate(
      eventConfigDataTypeSnapshotStub().imei,
      eventConfigDataTypeSnapshotStub().triggers,
      '11111',
      null,
    )
    expect(utils.publishOnAuditLogsTopic).not.toBeCalled()
    expect(service.logDeclaredUtils).not.toBeCalled()
  })

  it('event-config-5: create event config(without exists entity) -  success ', async () => {
    jest.spyOn(eventConfigModelMock, 'findOne').mockImplementation((): any => {
      return {
        exec: () => {
          return null
        },
      }
    })
    jest.spyOn(service, 'logDeclaredUtils')
    const result = await service.putOrCreate(
      eventConfigDataTypeSnapshotStub().imei,
      eventConfigDataTypeSnapshotStub().triggers,
      '11111',
      auditLogHeaders,
    )
    expect(result).toMatchObject(eventConfigDataTypeSnapshotStub())
    expect(service.logDeclaredUtils).toBeCalled()
  })

  it('event-config-6: create many event config - success ', async () => {
    const eventConfigDataTypeVideoStub1 = eventConfigDataTypeVideoStub('1234')
    const eventConfigDataTypeVideoStub2 = eventConfigDataTypeVideoStub('2345')
    const eventConfigDataTypeVideoStub3 = eventConfigDataTypeVideoStub('3456')
    const getBulkReturnData1 = [
      eventConfigDataTypeVideoStub1,
      eventConfigDataTypeVideoStub2,
    ]

    const getBulkReturnData2 = [
      eventConfigDataTypeVideoStub1,
      eventConfigDataTypeVideoStub2,
      eventConfigDataTypeVideoStub3,
    ]

    jest
      .spyOn(service, 'getBulkEventConfig')
      .mockReturnValueOnce(
        Promise.resolve(getBulkReturnData1 as EventConfigDocument[]),
      )
      .mockReturnValueOnce(
        Promise.resolve(getBulkReturnData2 as EventConfigDocument[]),
      )
    jest.spyOn(eventConfigModelMock, 'insertMany')
    jest.spyOn(eventConfigModelMock, 'updateMany')
    jest.spyOn(utils, 'publishOnAuditLogsTopic')
    jest.spyOn(service, 'logDeclaredUtils')

    const createBulkDevicesMediaConfigDto = new CreateBulkEventConfigDto()
    createBulkDevicesMediaConfigDto.imeis = ['1234', '2345', '3456']
    createBulkDevicesMediaConfigDto.triggers =
      eventConfigDataTypeVideoStub().triggers
    const result = await service.putOrCreateBulkEventConfig(
      createBulkDevicesMediaConfigDto,
      auditLogHeaders,
      '11111',
    )
    expect(result).toEqual(
      createBulkDevicesMediaConfigDto.imeis.map((imei) => ({
        imei,
        triggers: createBulkDevicesMediaConfigDto.triggers,
      })),
    )
    expect(eventConfigModelMock.insertMany).toBeCalledWith([
      {
        imei: '3456',
        triggers: createBulkDevicesMediaConfigDto.triggers,
      },
    ])
    expect(eventConfigModelMock.updateMany).toBeCalledWith(
      {
        imei: { $in: ['1234', '2345'] },
      },
      {
        $set: {
          triggers: createBulkDevicesMediaConfigDto.triggers,
        },
      },
    )
    expect(utils.publishOnAuditLogsTopic).toBeCalledTimes(3)
    expect(service.logDeclaredUtils).toBeCalled()
  })

  it('event-config-7: Delete event config - success ', async () => {
    jest.spyOn(eventConfigModelMock, 'findOneAndDelete')
    await service.deleteOne(eventConfigDataTypeSnapshotStub().imei)
    expect(eventConfigModelMock.findOneAndDelete).toBeCalled()
  })

  it('event-config-8: Delete event config - error ', async () => {
    jest.spyOn(eventConfigModelMock, 'findOneAndDelete')
    await service.deleteOne(notExistImei)
    expect(loggerService.warn).toBeCalled()
  })

  describe('onModuleInit', () => {
    jest.spyOn(utils, 'initializeKafkaClient').mockImplementation()
    it('onModuleInit should call to initializeKafkaClient', async () => {
      await service.onModuleInit()
      expect(utils.initializeKafkaClient).toBeCalledWith(
        clientKafka,
        (service as any).logger,
      )
    })
  })

  describe('setKafkaProducer', () => {
    it('setKafkaProducer should call to logger.debug', () => {
      service.setKafkaProducer({} as any as Producer)
      expect(loggerService.debug).toBeCalled()
    })
  })
})
