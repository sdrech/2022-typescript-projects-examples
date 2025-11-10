import { Test, TestingModule } from '@nestjs/testing'
import { EventConfigController } from './event-config.controller'
import { EventConfigService } from './event-config.service'
import { CreateBulkEventConfigDto } from './dto/create-bulk-event-config.dto'
import { GetBulkEventConfigDto } from './dto/get-bulk-event-config.dto'
import { eventConfigDataTypeSnapshotStub } from '../../test/stubs/event-config.stub'
import { UpdateEventConfigDto } from './dto/update-event-config.dto'
import {
  CLOUD_FACTORY_RESET_RECEIVED_TOPIC,
  KAFKA_CLIENT_TOKEN,
} from '../constants'
import { LoggerMock } from '../../test/logger/logger.mock'
import { Logger } from '@nestjs/common'
import {
  KafkaConsumerProcessError,
  ResourceNotFoundError,
} from '@company-name/cloud-core/dist/errors'
import { EventType, DataTypes } from '@company-name/cloud-core/dist/interfaces/events'
import { Request } from 'express'
import { IncomingKafkaMessage } from '@company-name/cloud-core/dist/interfaces/incoming-kafka-message'
import { KafkaTopics } from '@company-name/cloud-core/dist/interfaces/kafka-topics'
import { IAuditLogHeaders } from '@company-name/cloud-core/dist/interfaces/audit-logs'

jest.mock('./event-config.service')
describe('EventConfigController', () => {
  let controller: EventConfigController
  let service: EventConfigService
  let loggerService: Logger

  class ClientProxyMock {
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
  const mockMessageDefaults = {
    attributes: 0,
    batchContext: {
      firstOffset: '',
      firstSequence: 0,
      firstTimestamp: '',
      inTransaction: false,
      isControlBatch: false,
      lastOffsetDelta: 0,
      magicByte: 0,
      maxTimestamp: '',
      partitionLeaderEpoch: 0,
      producerEpoch: 0,
      producerId: '',
    },
    headers: undefined,
    isControlRecord: false,
    magicByte: 0,
    offset: '',
    partition: 0,
    size: 0,
    timestamp: '',
  }

  const auditLogHeaders: IAuditLogHeaders = {
    userId: 11,
    partnerId: null,
    partnerContactId: null,
    orgId: 22,
    originalEndPoint: '/endpoint',
  }

  function initReq(requestId: string) {
    return {
      requestId,
    } as Request & { requestId: string }
  }

  const requestId = '123-abc-789'
  const imei = '1234'

  beforeEach(async () => {
    const LoggerProvider = {
      provide: Logger,
      useClass: LoggerMock,
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventConfigController],
      providers: [EventConfigService, ClientKafkaProvider, LoggerProvider],
    }).compile()

    controller = module.get<EventConfigController>(EventConfigController)
    service = module.get<EventConfigService>(EventConfigService)
    loggerService = (controller as any).logger
    jest.clearAllMocks()
    jest.spyOn(loggerService, 'error').mockImplementation()
    jest.spyOn(loggerService, 'log').mockImplementation()
    jest.spyOn(loggerService, 'debug').mockImplementation()
    jest.spyOn(loggerService, 'warn').mockImplementation()
  })
  afterEach(jest.restoreAllMocks)

  it('EventConfigController-1: should be defined', () => {
    expect(controller).toBeDefined()
    expect(service).toBeDefined()
    expect(loggerService).toBeDefined()
  })

  it('EventConfigController-2: putOrCreateBulkEventConfig - success', async () => {
    const result = await controller.putOrCreateBulkEventConfig(
      initReq(requestId),
      {
        imeis: [],
        triggers: [],
      },
      auditLogHeaders,
    )
    expect(result).toEqual(undefined) // void function
  })

  it('EventConfigController-2.5: putOrCreateBulkEventConfig - success', async () => {
    jest
      .spyOn(service, 'putOrCreateBulkEventConfig')
      .mockReturnValue(Promise.resolve([eventConfigDataTypeSnapshotStub(imei)]))
    const result = await controller.putOrCreateBulkEventConfig(
      initReq(requestId),
      {
        imeis: [imei],
        triggers: eventConfigDataTypeSnapshotStub().triggers,
      },
      auditLogHeaders,
    )
    expect(result).toEqual([eventConfigDataTypeSnapshotStub(imei)])
  })

  it('EventConfigController-3: getBulkEventConfig - success', async () => {
    jest
      .spyOn(service, 'getBulkEventConfig')
      .mockImplementation((): any => [eventConfigDataTypeSnapshotStub()])
    const getBulkEventConfigDto = new GetBulkEventConfigDto()
    getBulkEventConfigDto.imeis = [eventConfigDataTypeSnapshotStub().imei]
    const result = await controller.getBulkEventConfig(
      initReq(requestId),
      getBulkEventConfigDto,
    )
    expect(result[0]).toMatchObject(eventConfigDataTypeSnapshotStub())
  })

  it('EventConfigController-4: getEventConfig - success', async () => {
    const eventConfig = eventConfigDataTypeSnapshotStub()
    jest.spyOn(service, 'getOne').mockImplementation((): any => ({
      toJSON: () => eventConfig,
    }))
    await controller.getEventConfig(initReq(requestId), eventConfig.imei)
    expect(service.getOne).toBeCalled()
  })

  it('EventConfigController-5: getEventConfig - Not Found Error', async () => {
    const eventConfig = eventConfigDataTypeSnapshotStub()
    jest.spyOn(service, 'getOne').mockImplementation((): any => null)
    await expect(
      controller.getEventConfig(initReq(requestId), eventConfig.imei),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('EventConfigController-6: putOrCreateEventConfig - success', async () => {
    const updateDeviceMediaConfigDto = new UpdateEventConfigDto()

    const result = await controller.putOrCreateEventConfig(
      eventConfigDataTypeSnapshotStub().imei,
      initReq(requestId),
      updateDeviceMediaConfigDto,
      auditLogHeaders,
    )
    expect(result).toEqual(undefined) // void function
  })
  describe('processOnRemovedDeviceMessage', () => {
    it('processOnRemovedDeviceMessage-1: success', async () => {
      const imei = '111'
      const mockMessage: IncomingKafkaMessage<
        { requestId: string; timestamp: number },
        unknown
      > = {
        ...mockMessageDefaults,
        topic: KafkaTopics.deviceRegistryRemovedDevice,
        key: imei,
        value: { requestId, timestamp: 1638877128 },
      }
      await controller.processOnRemovedDeviceMessage(mockMessage)
      expect(service.deleteOne).toBeCalledWith(imei, requestId)
    })

    it('processOnRemovedDeviceMessage-2: failure', async () => {
      jest.spyOn(service, 'deleteOne').mockImplementation(() => {
        throw new Error()
      })
      const imei = '111'
      const mockMessage: IncomingKafkaMessage<
        { requestId: string; timestamp: number },
        unknown
      > = {
        ...mockMessageDefaults,
        topic: KafkaTopics.deviceRegistryRemovedDevice,
        key: imei,
        value: { requestId, timestamp: 1638877128 },
      }
      await expect(
        controller.processOnRemovedDeviceMessage(mockMessage),
      ).rejects.toThrow(
        new KafkaConsumerProcessError(
          imei,
          KafkaTopics.deviceRegistryRemovedDevice,
        ),
      )
      expect(loggerService.error).toBeCalledTimes(1)
    })
  })

  it('EventConfigController-9.1: processFactoryReset - success', async () => {
    jest.spyOn(service, 'putOrCreate')
    const imei = eventConfigDataTypeSnapshotStub().imei
    const mockMessage = {
      ...mockMessageDefaults,
      topic: CLOUD_FACTORY_RESET_RECEIVED_TOPIC,
      key: imei,
      value: {
        requestId,
        data: {},
      },
    }
    await controller.processFactoryReset(mockMessage)
    expect(service.putOrCreate).toBeCalledWith(
      imei,
      [],
      mockMessage.value.requestId,
    )
    expect(loggerService.log).toBeCalled()
  })

  it('EventConfigController-9.2: processFactoryReset - failed', async () => {
    jest.spyOn(service, 'putOrCreate').mockImplementation((): any => {
      throw new Error('test error')
    })
    const imei = eventConfigDataTypeSnapshotStub().imei
    const mockMessage = {
      ...mockMessageDefaults,
      topic: CLOUD_FACTORY_RESET_RECEIVED_TOPIC,
      key: imei,
      value: {
        requestId,
        data: {},
      },
    }
    await controller.processFactoryReset(mockMessage)
    expect(service.putOrCreate).toBeCalledWith(
      imei,
      [],
      mockMessage.value.requestId,
    )
    expect(loggerService.log).toBeCalled()
    expect(loggerService.error).toBeCalled()
  })

  it('EventConfigController-9.3: data with organization settings processFactoryReset - success', async () => {
    jest.spyOn(service, 'putOrCreate')
    const imei = eventConfigDataTypeSnapshotStub().imei
    const mockMessage = {
      ...mockMessageDefaults,
      topic: CLOUD_FACTORY_RESET_RECEIVED_TOPIC,
      key: imei,
      value: {
        requestId,
        data: {
          eventsConfig: {
            triggers: [
              { trigger_type: EventType.accOff, data_type: DataTypes.snapshot },
            ],
          },
        },
      },
    }
    await controller.processFactoryReset(mockMessage)
    expect(service.putOrCreate).toBeCalledWith(
      imei,
      [{ trigger_type: EventType.accOff, data_type: DataTypes.snapshot }],
      mockMessage.value.requestId,
    )
    expect(loggerService.log).toBeCalled()
  })

  it('EventConfigController-9.4: data with organization settings processFactoryReset - failed', async () => {
    jest.spyOn(service, 'putOrCreate').mockImplementation((): any => {
      throw new Error('test error')
    })
    const imei = eventConfigDataTypeSnapshotStub().imei
    const mockMessage = {
      ...mockMessageDefaults,
      topic: CLOUD_FACTORY_RESET_RECEIVED_TOPIC,
      key: imei,
      value: {
        requestId,
        data: {
          eventsConfig: {
            triggers: [
              { trigger_type: EventType.accOff, data_type: DataTypes.snapshot },
            ],
          },
        },
      },
    }
    await controller.processFactoryReset(mockMessage)
    expect(service.putOrCreate).toBeCalledWith(
      imei,
      [{ trigger_type: EventType.accOff, data_type: DataTypes.snapshot }],
      mockMessage.value.requestId,
    )
    expect(loggerService.log).toBeCalled()
    expect(loggerService.error).toBeCalled()
  })
})
