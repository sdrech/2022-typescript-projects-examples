import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Logger,
  Header,
  Get,
  Req,
  Delete,
} from '@nestjs/common'
import { DeviceDataUsageService } from './device-data-usage.service'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ConflictErrorDto } from '@company-name/cloud-core/dist/dto/conflict-error.dto'
import { NotFoundErrorDto } from '@company-name/cloud-core/dist/dto/not-found-error.dto'
import {
  CreateDeviceDataUsageDto,
  DataUsageDtoResponse,
} from './dto/create-device-data-usage.dto'
import { GetFreshDeviceDataUsageDto } from './dto/get-fresh-device-data-usage.dto'
import { IncreaseDataUsageCountersDto } from './dto/increase-data-usage-counters.dto'
import { DataUsageLimitationDto } from './dto/data-usage-limitation.dto'
import { ImeisListDto } from './dto/imeis-list.dto'
import { DeviceDataUsageHistoryResponseParams } from './dto/get-device-data-usage-history-response.dto'
import { EventPattern, Payload } from '@nestjs/microservices'
import { KafkaTopics } from '@company-name/cloud-core/dist/interfaces/kafka-topics'
import {
  IMessageWithRequestId,
  IncomingKafkaMessage,
} from '@company-name/cloud-core/dist/interfaces/incoming-kafka-message'
import { EventsConfig } from '@company-name/cloud-core/dist/interfaces/events'
import { randomUUID } from 'crypto'

@Controller('data-usage')
@ApiTags('data-usage')
export class DeviceDataUsageController {
  private readonly logger: Logger = new Logger(DeviceDataUsageController.name)

  constructor(
    private readonly deviceDataUsageService: DeviceDataUsageService,
  ) {}

  @Post()
  @ApiOperation({ description: 'Create data usage record' })
  @ApiResponse({
    status: 201,
    description: 'Success operation',
    type: DataUsageDtoResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict error',
    type: ConflictErrorDto,
  })
  @Header('content-type', 'application/json')
  create(
    @Req() req: Request & { requestId: string },
    @Body() data: CreateDeviceDataUsageDto,
  ) {
    const { requestId } = req
    this.logger.log({
      message: 'create a new data usage',
      method: this.create.name,
      imei: data.imei,
      requestId,
    })
    return this.deviceDataUsageService.create(data, requestId)
  }

  @Post('status')
  @ApiOperation({ description: 'Get data usage status' })
  @ApiResponse({
    status: 201,
    description: 'Success operation',
    type: DataUsageDtoResponse,
  })
  @Header('content-type', 'application/json')
  processEventsStatus(
    @Req() req: Request & { requestId: string },
    @Body() dataProfileLimits: DataUsageLimitationDto,
  ) {
    const imei = dataProfileLimits.serialNumber
    const { requestId } = req
    this.logger.log({
      message: 'Get data usage status',
      method: this.processEventsStatus.name,
      imei,
      requestId,
    })
    return this.deviceDataUsageService.areEventLimitsReachedAndCountersNotIncreased(
      imei,
      requestId,
      dataProfileLimits,
    )
  }

  @Get('/history/:imei')
  @ApiOperation({ description: 'Get full data usage history' })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: DeviceDataUsageHistoryResponseParams,
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
    type: NotFoundErrorDto,
  })
  getHistory(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
  ) {
    const { requestId } = req
    this.logger.log({
      message: 'Get data usage history',
      method: this.getHistory.name,
      imei,
      requestId,
    })
    return this.deviceDataUsageService.getHistory(imei, requestId)
  }

  @Get(':imei')
  @ApiOperation({ description: 'Get last recorded data usage in DB' })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: DataUsageDtoResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
    type: NotFoundErrorDto,
  })
  getRecordedOne(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
  ) {
    const { requestId } = req
    this.logger.log({
      message: 'Get data usage',
      method: this.getRecordedOne.name,
      imei,
      requestId,
    })
    return this.deviceDataUsageService.findLastOne(imei, requestId)
  }

  @Patch(':imei/verification')
  @ApiOperation({
    description: `
  Get data usage from DB and refresh the counters on the fly in the following cases:
  1. Daily counter will be reset in case the last update of that counter was before today
  2. Month counter will be reset in case the last update of that counter was before the billing day
  3. Month counter will be reset in case the billing day is changed`,
  })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: DataUsageDtoResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
    type: NotFoundErrorDto,
  })
  getFreshOne(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
    @Body() dto: GetFreshDeviceDataUsageDto,
  ) {
    const { billingDay } = dto
    const { requestId } = req
    this.logger.log({
      message: 'get updated data usage (controller layer)',
      method: this.getFreshOne.name,
      imei,
      requestId,
    })
    return this.deviceDataUsageService.getFullActualOne(
      imei,
      billingDay,
      requestId,
    )
  }

  @Patch(':imei')
  @ApiOperation({
    description: 'Patch data usage counters by their delta value',
  })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: DataUsageDtoResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
    type: NotFoundErrorDto,
  })
  patchCounters(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
    @Body() data: IncreaseDataUsageCountersDto,
  ) {
    const { requestId } = req
    this.logger.log({
      message: 'update data usage',
      method: this.patchCounters.name,
      imei,
      data,
      requestId,
    })
    return this.deviceDataUsageService.increaseCounters(imei, data, requestId)
  }

  @Delete('/:imei')
  @ApiOperation({
    summary: 'Remove history for a single device',
    description: 'Remove full data usage history for specific imei',
  })
  @ApiResponse({
    status: 204,
    description: 'Record is removed',
  })
  @ApiResponse({
    status: 404,
    description: 'Resource is not found',
    type: NotFoundErrorDto,
  })
  async remove(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
  ) {
    this.logger.log({
      message: 'Trying to remove full DataUsageHistory for specific imei',
      method: this.remove.name,
      imei,
      requestId: req.requestId,
    })
    await this.deviceDataUsageService.remove(imei, req.requestId)
  }

  @Delete()
  @ApiOperation({
    summary: 'Remove history for bunch of devices',
    description: 'Remove full data usage history for the list of IMEIs',
  })
  @Header('content-type', 'application/json')
  @ApiResponse({
    status: 204,
    description: 'Records are removed',
  })
  @ApiResponse({
    status: 404,
    description: 'Required resources are not found',
    type: NotFoundErrorDto,
  })
  async removeMany(
    @Req() req: Request & { requestId: string },
    @Body() imeisList: ImeisListDto,
  ) {
    const imeis = imeisList.imeis
    if (!imeis || !imeis.length) {
      this.logger.log({
        message: 'Trying to remove full DataUsageHistory for many imeis',
        method: this.removeMany.name,
        imeis: imeis.toString(),
        requestId: req.requestId,
      })
    } else {
      imeis.forEach((imei) => {
        this.logger.log({
          message: 'Trying to remove full DataUsageHistory for many imeis',
          method: this.removeMany.name,
          imei: imei.toString(),
          requestId: req.requestId,
        })
      })
    }
    await this.deviceDataUsageService.removeMany(imeisList.imeis, req.requestId)
  }

  @EventPattern(KafkaTopics.cloudFactoryResetReceived)
  async processFactoryResetDataUsage(
    @Payload()
    message: IMessageWithRequestId<{
      requestId: string
      data: { eventsConfig?: EventsConfig }
    }>,
  ) {
    const { topic, key: imei, value } = message
    const { requestId } = value
    this.logger.log({
      message: 'factory reset message consumed',
      method: this.processFactoryResetDataUsage.name,
      topic,
      imei,
      requestId,
    })
    this.deviceDataUsageService.createOne(imei, requestId).catch((err) =>
      this.logger.error({
        message:
          'Exception in DeviceDataUsageController on Kafka trigger [FactoryReset]',
        method: this.processFactoryResetDataUsage.name,
        topic,
        imei,
        err,
        requestId,
      }),
    )
  }

  @EventPattern(KafkaTopics.deviceDataDiagnostics)
  async processDeviceDiagnostics(
    @Payload() message: IncomingKafkaMessage<any, string>,
  ): Promise<void> {
    const requestId = randomUUID()
    const imei = message.key
    const data = message.value
    const dataUsageTx = data.dataUsageTx
    const dataUsageRx = data.dataUsageRx
    try {
      if (!dataUsageTx && !dataUsageRx) {
        this.logger.log({
          message:
            'Received diagnostics message after factory reset from device side',
          method: this.processDeviceDiagnostics.name,
          imei,
          requestId,
          topic: KafkaTopics.deviceDataDiagnostics,
          kafkaMessage: message,
          dataUsageTx,
          dataUsageRx,
        })
        this.deviceDataUsageService.createOne(imei, requestId)
      } else {
        this.logger.log({
          message: 'Received diagnostics message from device, process skipped',
          method: this.processDeviceDiagnostics.name,
          imei,
          requestId,
          topic: KafkaTopics.deviceDataDiagnostics,
          kafkaMessage: message,
          dataUsageTx,
          dataUsageRx,
        })
      }
    } catch (err) {
      this.logger.error({
        message: 'Failure while handling kafka message',
        method: this.processDeviceDiagnostics.name,
        err,
        topic: KafkaTopics.deviceDataDiagnostics,
        imei,
        kafkaMessage: message,
        requestId,
      })
    }
  }
}
