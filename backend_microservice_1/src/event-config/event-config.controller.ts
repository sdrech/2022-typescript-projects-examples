import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  Inject,
  Logger,
  Req,
  Put,
  Headers,
} from '@nestjs/common'
import { EventConfigService } from './event-config.service'
import { CreateBulkEventConfigDto } from './dto/create-bulk-event-config.dto'
import {
  GetBulkEventConfigDto,
  GetBulkEventConfigOneResponseDto,
  GetBulkEventConfigManyResponseDto,
} from './dto/get-bulk-event-config.dto'
import { UpdateEventConfigDto } from './dto/update-event-config.dto'
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger'
import { RequestIdDto } from '@company-name/cloud-core/dist/dto/requestId.dto'
import { NotFoundErrorDto } from '@company-name/cloud-core/dist/dto/not-found-error.dto'
import { EventPattern, Payload } from '@nestjs/microservices'
import { CLOUD_FACTORY_RESET_RECEIVED_TOPIC } from '../constants'
import { IMessageWithRequestId } from '@company-name/cloud-core/dist/interfaces/incoming-kafka-message'
import {
  ResourceNotFoundError,
  KafkaConsumerProcessError,
} from '@company-name/cloud-core/dist/errors'
import { EventsConfig } from '@company-name/cloud-core/dist/interfaces/events'
import { Request } from 'express'
import { KafkaTopics } from '@company-name/cloud-core/dist/interfaces/kafka-topics'
import { IAuditLogHeaders } from '@company-name/cloud-core/dist/interfaces/audit-logs'
import { convertNull } from '@company-name/cloud-core/dist/utils'
@ApiTags('event-config')
@Controller('event-config')
export class EventConfigController {
  private readonly logger: Logger = new Logger(EventConfigController.name)

  constructor(private readonly eventConfigService: EventConfigService) {}

  @Put()
  @ApiOperation({
    description:
      'This function is used to put or create bulk devices event config',
  })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: GetBulkEventConfigManyResponseDto,
  })
  async putOrCreateBulkEventConfig(
    @Req() req: Request & { requestId: string },
    @Body() createBulkDevicesMediaConfigDto: CreateBulkEventConfigDto,
    @Headers() eventConfigHeaders: any,
  ) {
    const auditLogHeaders: IAuditLogHeaders = {
      userId: convertNull(eventConfigHeaders.userid),
      partnerId: convertNull(eventConfigHeaders.partnerid),
      partnerContactId: convertNull(eventConfigHeaders.partnercontactid),
      orgId: convertNull(eventConfigHeaders.orgid),
      originalEndPoint: convertNull(eventConfigHeaders.originalendpoint),
    }
    const requestId = req.requestId
    const imeis = createBulkDevicesMediaConfigDto.imeis
    try {
      this.logger.log({
        message:
          'Trying to put or create bulk event config for single or many imeis',
        method: this.putOrCreateBulkEventConfig.name,
        imeis,
        imeisLength: imeis?.length,
        requestId,
        triggers: createBulkDevicesMediaConfigDto.triggers,
        auditLogHeaders,
      })
      const res = await this.eventConfigService.putOrCreateBulkEventConfig(
        createBulkDevicesMediaConfigDto,
        auditLogHeaders,
        requestId,
      )
      this.logger.log({
        message: 'Successfully put or created bulk event config',
        method: this.putOrCreateBulkEventConfig.name,
        imeis,
        triggers: createBulkDevicesMediaConfigDto.triggers,
        requestId,
        auditLogHeaders,
      })
      return res
    } catch (error) {
      if (!imeis || !imeis.length) {
        this.logger.error({
          message: 'Exception in upserting the list of EventConfigs',
          method: this.putOrCreateBulkEventConfig.name,
          imeis,
          error,
          requestId,
        })
      } else {
        imeis.forEach((imei) => {
          this.logger.log({
            message: 'Exception in upserting the list of EventConfigs for imei',
            method: this.putOrCreateBulkEventConfig.name,
            imei,
            error,
            requestId,
          })
        })
      }
    }
  }

  @Put('/:imei')
  @ApiOperation({
    description: 'This function is used to put or create a device event config',
  })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: RequestIdDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
    type: NotFoundErrorDto,
  })
  async putOrCreateEventConfig(
    @Param('imei') imei: string,
    @Req() req: Request & { requestId: string },
    @Body() updateDeviceMediaConfigDto: UpdateEventConfigDto,
    @Headers() eventConfigHeaders: any,
  ) {
    const auditLogHeaders: IAuditLogHeaders = {
      userId: convertNull(eventConfigHeaders.userid),
      partnerId: convertNull(eventConfigHeaders.partnerid),
      partnerContactId: convertNull(eventConfigHeaders.partnercontactid),
      orgId: convertNull(eventConfigHeaders.orgid),
      originalEndPoint: convertNull(eventConfigHeaders.originalendpoint),
    }
    const requestId = req.requestId
    try {
      this.logger.log({
        message: 'Trying to put or create device event config',
        method: this.putOrCreateEventConfig.name,
        imei,
        data: updateDeviceMediaConfigDto,
        auditLogHeaders,
        requestId,
      })
      const res = await this.eventConfigService.putOrCreate(
        imei,
        updateDeviceMediaConfigDto.triggers,
        requestId,
        auditLogHeaders,
      )
      this.logger.log({
        message: 'Successfully put or created device event config',
        method: this.putOrCreateEventConfig.name,
        imei,
        res,
        auditLogHeaders,
        requestId,
      })
      return res
    } catch (error) {
      this.logger.error({
        message: 'Exception in upserting single EventConfig',
        method: this.putOrCreateEventConfig.name,
        imei,
        error,
        auditLogHeaders,
        requestId,
      })
    }
  }

  @Post()
  @ApiOperation({
    description: 'This function is used to get bulk devices event config',
  })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: GetBulkEventConfigManyResponseDto,
  })
  @HttpCode(200)
  async getBulkEventConfig(
    @Req() req: Request & { requestId: string },
    @Body() getBulkEventConfigDto: GetBulkEventConfigDto,
  ) {
    const requestId = req.requestId
    const imeis = getBulkEventConfigDto.imeis
    try {
      if (!imeis || !imeis.length) {
        this.logger.log({
          message: 'Trying to get bulk event config',
          method: this.getBulkEventConfig.name,
          imeis,
          requestId,
        })
      } else {
        imeis.forEach((imei) => {
          this.logger.log({
            message: 'Trying to get bulk event config for imei',
            method: this.getBulkEventConfig.name,
            imei,
            requestId,
          })
        })
      }
      const res = await this.eventConfigService.getBulkEventConfig(
        getBulkEventConfigDto,
        requestId,
      )
      this.logger.log({
        message: 'Successfully got bulk event config',
        method: this.getBulkEventConfig.name,
        imeis: getBulkEventConfigDto,
        res,
        requestId,
      })
      return res
    } catch (error) {
      if (!imeis || !imeis.length) {
        this.logger.error({
          message: 'Exception in getting EventConfig for IMEIs list',
          method: this.getBulkEventConfig.name,
          imeis,
          error,
          requestId,
        })
      } else {
        imeis.forEach((imei) => {
          this.logger.error({
            message: 'Exception in getting EventConfig for IMEIs list for imei',
            method: this.getBulkEventConfig.name,
            imei,
            error,
            requestId,
          })
        })
      }
    }
  }

  @Get('/:imei')
  @ApiOperation({
    description: 'This function is used to get a device event config',
  })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: GetBulkEventConfigOneResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
    type: NotFoundErrorDto,
  })
  async getEventConfig(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
  ) {
    const requestId = req.requestId
    this.logger.log({
      message: 'Trying to get event config',
      method: this.getEventConfig.name,
      imei,
      requestId,
    })
    const eventConfigDocument = await this.eventConfigService.getOne(
      imei,
      requestId,
    )
    if (!eventConfigDocument) {
      throw new ResourceNotFoundError(imei)
    }
    const eventConfig = eventConfigDocument.toJSON()
    delete eventConfig._id
    delete eventConfig.imei
    this.logger.log({
      message: 'Successfully got event config',
      method: this.getEventConfig.name,
      imei,
      res: eventConfig,
      requestId,
    })
    return eventConfig
  }

  @EventPattern(KafkaTopics.deviceRegistryRemovedDevice)
  async processOnRemovedDeviceMessage(
    @Payload()
    message: IMessageWithRequestId<
      { requestId: string; timestamp: number },
      unknown
    >,
  ) {
    let imei: string
    let requestId: string
    try {
      imei = message.key as string
      requestId = message.value.requestId
      const consumeTs = new Date().getTime()
      const authTimestamp = message.value.timestamp
      this.logger.debug({
        imei,
        message:
          'Time passed from the publishing time to the actual consumption - media',
        method: this.processOnRemovedDeviceMessage.name,
        topic: KafkaTopics.deviceRegistryRemovedDevice,
        authTimestamp,
        consumeTs,
        timePassedInMilliSec: consumeTs - authTimestamp,
        requestId,
      })
      this.logger.log({
        imei,
        message:
          'Trying to delete a mongodb event configuration record of the removed device',
        method: this.processOnRemovedDeviceMessage.name,
        topic: KafkaTopics.deviceRegistryRemovedDevice,
        kafkaMessage: message,
        requestId,
      })
      await this.eventConfigService.deleteOne(imei, requestId)

      this.logger.log({
        imei,
        message:
          'Successfully deleted a mongodb event configuration record of the removed device',
        method: this.processOnRemovedDeviceMessage.name,
        topic: KafkaTopics.deviceRegistryRemovedDevice,
        kafkaMessage: message,
        requestId,
      })
    } catch (error) {
      this.logger.error({
        message:
          'Failed to delete a mongodb event configuration record of the removed device',
        method: this.processOnRemovedDeviceMessage.name,
        error,
        topic: KafkaTopics.deviceRegistryRemovedDevice,
        kafkaMessage: message,
        requestId,
        imei,
      })
      throw new KafkaConsumerProcessError(
        imei,
        KafkaTopics.deviceRegistryRemovedDevice,
      )
    }
  }

  @EventPattern(CLOUD_FACTORY_RESET_RECEIVED_TOPIC)
  async processFactoryReset(
    @Payload()
    message: IMessageWithRequestId<{
      requestId: string
      data: {
        eventsConfig?: EventsConfig
      }
    }>,
  ) {
    const { topic, key: imei, value } = message
    const { requestId, data: orgSettings } = value
    const { eventsConfig } = orgSettings
    this.logger.log({
      message: `kafka consume from topic: ${message.topic}`,
      method: this.processFactoryReset.name,
      topic,
      imei,
      eventsConfig,
      requestId,
    })
    try {
      await this.eventConfigService.putOrCreate(
        imei,
        eventsConfig && eventsConfig.triggers ? eventsConfig.triggers : [],
        requestId,
      )
    } catch (error) {
      this.logger.error({
        message: 'Exception in EventConfigs on Kafka trigger [FactoryReset]',
        method: this.processFactoryReset.name,
        topic,
        imei,
        eventsConfig,
        error,
        requestId,
      })
    }
  }
}
