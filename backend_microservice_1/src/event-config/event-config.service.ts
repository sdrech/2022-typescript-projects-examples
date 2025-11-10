import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { CreateBulkEventConfigDto } from './dto/create-bulk-event-config.dto'
import { GetBulkEventConfigDto } from './dto/get-bulk-event-config.dto'
import {
  EventConfigEntity,
  EventConfigDocument,
} from './schemas/event-config.schema'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { IAuditLogHeaders } from '@company-name/cloud-core/dist/interfaces/audit-logs'
import {
  initializeKafkaClient,
  publishOnAuditLogsTopic,
} from '@company-name/cloud-core/dist/utils'
import { AUDIT_LOGS_MESSAGES } from '@company-name/cloud-core/dist/constants'
import { KAFKA_CLIENT_TOKEN } from '../constants'
import { ClientKafka } from '@nestjs/microservices'
import { IService } from '@company-name/cloud-core/dist/interfaces/service'
import { Producer } from '@nestjs/microservices/external/kafka.interface'

@Injectable()
export class EventConfigService implements OnModuleInit, IService {
  private readonly logger: Logger = new Logger(EventConfigService.name)

  private kafkaProducer: Producer

  public setKafkaProducer(producer: Producer) {
    this.logger.debug({
      method: this.setKafkaProducer.name,
      producer,
      message: 'Set kafka producer',
    })
    this.kafkaProducer = producer
  }

  public getKafkaProducer(): Producer {
    if (!this.kafkaProducer) {
      {
        this.logger.warn({
          method: this.getKafkaProducer.name,
          producer: this.kafkaProducer,
          message: 'Expected KafkaProducer is not defined',
        })
      }
    }
    return this.kafkaProducer
  }

  public getKafkaClient(): ClientKafka {
    if (!this.kafkaClient) {
      this.logger.warn({
        method: this.getKafkaClient.name,
        client: this.kafkaClient,
        message: 'Expected KafkaClient is not defined',
      })
    }
    return this.kafkaClient
  }

  public getLogger(): Logger {
    // no log for NR here (if defined): we want to omit it for handling the bulk imeis request
    return this.logger
  }

  public logDeclaredUtils(
    calledFrom: string,
    isForExistingEntities = false,
  ): void {
    this.logger.debug({
      method: this.logDeclaredUtils.name,
      logger: this.logger,
      kafkaClient: this.kafkaClient,
      kafkaProducer: this.kafkaProducer,
      message: 'kafkaClient, kafkaProducer and Logger from EventConfigService',
      calledFrom,
      isForExistingEntities,
    })
  }

  constructor(
    @InjectModel(EventConfigEntity.name)
    private eventConfigModel: Model<EventConfigDocument>,
    @Inject(KAFKA_CLIENT_TOKEN) private readonly kafkaClient: ClientKafka,
  ) {}

  async getOne(
    imei: string,
    requestId: string = null,
  ): Promise<EventConfigDocument> {
    try {
      this.logger.log({
        message: 'Trying to get event config from mongodb',
        method: this.getOne.name,
        imei,
        requestId,
      })
      let eventConfig = await this.eventConfigModel.findOne({ imei }).exec()
      if (!eventConfig) {
        this.logger.log({
          message:
            'Event config not found. About to create event config for new device.',
          method: this.getOne.name,
          imei,
          requestId,
          eventConfig,
        })
        eventConfig = await this.putOrCreate(imei, [], requestId)
      }
      this.logger.log({
        message: 'Successfully got event config from mongodb',
        method: this.getOne.name,
        imei,
        requestId,
        eventConfig,
      })
      return eventConfig
    } catch (error) {
      this.logger.error({
        message: 'Exception in getting single EventConfig (service layer)',
        method: this.getOne.name,
        imei,
        error,
        requestId,
      })
    }
  }

  async getBulkEventConfig(
    getBulkEventConfigDto: GetBulkEventConfigDto,
    requestId: string = null,
  ): Promise<EventConfigDocument[]> {
    const imeis = getBulkEventConfigDto.imeis
    try {
      this.logger.log({
        message: 'Trying to get bulk event config from mongodb',
        method: this.getBulkEventConfig.name,
        imeis,
        requestId,
      })
      const eventConfigDocs = await this.eventConfigModel
        .find({
          imei: { $in: imeis },
        })
        .exec()
      if (!eventConfigDocs) {
        this.logger.log({
          message:
            'Failed to get bulk event config from mongodb - resources not found. will return an empty array',
          method: this.getBulkEventConfig.name,
          imeis,
          requestId,
        })
        return []
      }
      this.logger.log({
        message: 'Successfully got bulk event config from mongodb',
        method: this.getBulkEventConfig.name,
        imeis,
        eventConfigDocs,
        requestId,
      })
      return eventConfigDocs
    } catch (error) {
      if (!imeis || !imeis.length) {
        this.logger.error({
          message: 'Exception in getting EventConfigs (service layer)',
          method: this.getBulkEventConfig.name,
          imeis,
          error,
          requestId,
        })
      } else {
        imeis.forEach((imei) => {
          this.logger.error({
            message:
              'Exception in getting EventConfigs (service layer) for imei',
            method: this.getBulkEventConfig.name,
            imei,
            error,
            requestId,
          })
        })
      }
    }
  }

  async putOrCreate(
    imei: string,
    triggers: EventConfigEntity['triggers'],
    requestId: string,
    auditLogHeaders?: IAuditLogHeaders,
  ): Promise<EventConfigDocument> {
    try {
      this.logger.debug({
        message: 'Trying to get event config from mongodb',
        method: this.putOrCreate.name,
        imei,
        triggers,
        auditLogHeaders,
        requestId,
      })
      const currentEventConfig = await this.eventConfigModel
        .findOne({ imei })
        .exec()
      if (!currentEventConfig) {
        const eventConfig: EventConfigEntity = {
          imei,
          triggers,
        }
        this.logger.warn({
          message:
            'Failed to get event config from mongodb - resource not found, Trying to create a new source',
          method: this.putOrCreate.name,
          imei,
          auditLogHeaders,
          requestId,
        })
        const res = await this.eventConfigModel.create(eventConfig)
        this.logger.debug({
          message: 'Successfully created event config in mongodb',
          method: this.putOrCreate.name,
          imei,
          auditLogHeaders,
          requestId,
        })

        if (auditLogHeaders) {
          this.logDeclaredUtils(this.putOrCreate.name)
          this.handleAuditLogs(
            auditLogHeaders,
            imei,
            requestId,
            currentEventConfig,
            triggers,
            this.putOrCreate.name,
          )
        }
        return res
      } else {
        this.logger.debug({
          message:
            'Successfully got event config from mongodb. Trying to put event config in mongodb',
          method: this.putOrCreate.name,
          imei,
          requestId,
        })
        const oldEventConfigTriggers = currentEventConfig.triggers.map(
          ({ trigger_type, data_type }) => ({ trigger_type, data_type }),
        )
        currentEventConfig.triggers = triggers
        const res = await currentEventConfig.save()
        this.logger.log({
          message: 'Successfully put event config in mongodb',
          method: this.putOrCreate.name,
          imei,
          oldEventConfigTriggers,
          newEventConfigTriggers: currentEventConfig.triggers,
          requestId,
        })
        if (auditLogHeaders) {
          this.logDeclaredUtils(this.putOrCreate.name, true)
          this.handleAuditLogs(
            auditLogHeaders,
            imei,
            requestId,
            oldEventConfigTriggers,
            triggers,
            this.putOrCreate.name,
          )
        }
        return res
      }
    } catch (error) {
      this.logger.error({
        message: 'Exception in upserting single EventConfig (service layer)',
        method: this.putOrCreate.name,
        imei,
        error,
        requestId,
      })
    }
  }

  async putOrCreateBulkEventConfig(
    createBulkDevicesMediaConfigDto: CreateBulkEventConfigDto,
    auditLogHeaders: IAuditLogHeaders,
    requestId: string,
  ): Promise<EventConfigEntity[]> {
    const imeis = createBulkDevicesMediaConfigDto.imeis
    const triggers = createBulkDevicesMediaConfigDto.triggers
    try {
      this.logger.log({
        message: 'Trying to put or create bulk event config in mongodb',
        method: this.putOrCreateBulkEventConfig.name,
        imeis,
        triggers,
        auditLogHeaders,
        requestId,
      })
      const currentEventConfigsByImei = this.extractImeisAsKeys(
        await this.getBulkEventConfig({
          imeis,
        }),
      )

      const existingImeis = Object.keys(currentEventConfigsByImei).filter(
        (imei) => imeis.includes(imei),
      )
      const newImeis = imeis.filter((imei) => !existingImeis.includes(imei))
      const allEventConfigPromises = []
      this.logger.debug({
        message: 'Event configs to be created or updated',
        method: this.putOrCreateBulkEventConfig.name,
        imeis,
        newImeis,
        existingImeis,
        imeisLength: imeis.length,
        newImeisLength: newImeis.length,
        existingImeisLength: existingImeis.length,
        promisesLength: allEventConfigPromises.length,
        auditLogHeaders,
        requestId,
      })

      if (newImeis.length) {
        const newEntities = newImeis.map((imei) => ({
          imei,
          triggers,
        }))
        allEventConfigPromises.push(
          this.eventConfigModel.insertMany(newEntities),
        )
        if (auditLogHeaders) {
          this.logDeclaredUtils(this.putOrCreateBulkEventConfig.name)
          newImeis.map((imei) => {
            this.handleAuditLogs(
              auditLogHeaders,
              imei,
              requestId,
              null,
              triggers,
              this.putOrCreateBulkEventConfig.name,
              true,
            )
          })
        }
      }
      if (existingImeis.length) {
        allEventConfigPromises.push(
          this.eventConfigModel.updateMany(
            {
              imei: { $in: existingImeis },
            },
            {
              $set: {
                triggers,
              },
            },
          ),
        )
        if (auditLogHeaders) {
          this.logDeclaredUtils(this.putOrCreateBulkEventConfig.name, true)
          existingImeis.map((imei) => {
            this.handleAuditLogs(
              auditLogHeaders,
              imei,
              requestId,
              currentEventConfigsByImei[imei],
              triggers,
              this.putOrCreateBulkEventConfig.name,
              true,
            )
          })
        }
      }
      await Promise.all(allEventConfigPromises)
      this.logger.log({
        message: 'Event configs successfully saved',
        method: this.putOrCreateBulkEventConfig.name,
        imeis,
        imeisLength: imeis.length,
        newImeisLength: newImeis.length,
        existingImeisLength: existingImeis.length,
        promisesLength: allEventConfigPromises.length,
        auditLogHeaders,
        requestId,
      })
      return await this.getBulkEventConfig({ imeis })
    } catch (error) {
      if (!imeis || !imeis.length) {
        this.logger.error({
          message: 'Exception in upserting EventConfigs (service layer)',
          method: this.putOrCreateBulkEventConfig.name,
          imeis,
          triggers: createBulkDevicesMediaConfigDto.triggers,
          error,
          auditLogHeaders,
          requestId,
        })
      } else {
        imeis.forEach((imei) => {
          this.logger.error({
            message:
              'Exception in upserting EventConfigs (service layer) for imei',
            method: this.putOrCreateBulkEventConfig.name,
            imei,
            triggers: createBulkDevicesMediaConfigDto.triggers,
            error,
            auditLogHeaders,
            requestId,
          })
        })
      }
    }
  }

  async deleteOne(imei: string, requestId: string = null) {
    try {
      this.logger.log({
        message: 'Trying to get and delete event config from mongodb',
        method: this.deleteOne.name,
        imei,
        requestId,
      })
      const eventConfig = await this.eventConfigModel
        .findOneAndDelete({ imei })
        .exec()
      if (!eventConfig) {
        this.logger.warn({
          message: 'failed to delete EventConfig - Resource Not Found',
          method: this.deleteOne.name,
          imei,
          requestId,
        })
      } else {
        this.logger.log({
          message: 'Successfully got and deleted event config from mongodb',
          method: this.deleteOne.name,
          imei,
          requestId,
        })
      }
    } catch (error) {
      this.logger.error({
        message: 'Exception in deleting EventConfig (service layer)',
        method: this.deleteOne.name,
        imei,
        error,
        requestId,
      })
      throw error
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log({
      message: 'Start generating on module init',
      method: this.onModuleInit.name,
    })
    this.setKafkaProducer(
      await initializeKafkaClient(this.kafkaClient, this.logger),
    )
  }

  private extractImeisAsKeys(
    imeisSettings: EventConfigEntity[],
  ): Record<string, EventConfigEntity> {
    const imeisSettingsKeyByImei = {}
    imeisSettings.forEach((settings) => {
      imeisSettingsKeyByImei[settings.imei] = settings
    })
    return imeisSettingsKeyByImei
  }

  private handleAuditLogs(
    auditLogHeaders: IAuditLogHeaders,
    imei: string,
    requestId: string,
    oldSettings: any,
    newSettings: any,
    calledFrom: string,
    isBulkRequest = false,
  ) {
    try {
      const auditLog = {
        message: AUDIT_LOGS_MESSAGES.UPDATE_EVENT_CONFIG,
        reason: auditLogHeaders.originalEndPoint,
        userId: auditLogHeaders.userId,
        partnerId: auditLogHeaders.partnerId,
        partnerContactId: auditLogHeaders.partnerContactId,
        orgId: auditLogHeaders.orgId,
        newValue: newSettings,
        prevValue: oldSettings,
      }
      if (!isBulkRequest) {
        this.logger.log({
          message: 'Trying to send audit log per imei for the request',
          method: this.handleAuditLogs.name,
          imei,
          requestId,
          auditLogHeaders,
          auditLog,
          calledFrom,
          isBulkRequest,
        })
      }
      publishOnAuditLogsTopic(this, imei, auditLog, requestId, isBulkRequest)
    } catch (err) {
      this.logger.error({
        message: 'Failure while trying to sent audit logs',
        method: this.handleAuditLogs.name,
        imei,
        requestId,
        err,
        calledFrom,
        isBulkRequest,
      })
    }
  }
}
