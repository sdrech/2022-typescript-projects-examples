import {
  Body,
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Post,
  Req,
} from '@nestjs/common'
import { DeviceMobileTrafficService } from './device-mobile-traffic.service'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { EventPattern, Payload } from '@nestjs/microservices'
import { randomUUID } from 'crypto'
import { IncomingKafkaMessage } from '@company-name/cloud-core/dist/interfaces/incoming-kafka-message'
import { GetDeviceMobileTrafficResponseDto } from './dto/get-device-mobile-traffic-response.dto'
import { NotFoundErrorDto } from '@company-name/cloud-core/dist/dto/not-found-error.dto'
import moment from 'moment'
import { GetDeviceMobileTrafficHistoryResponseDto } from './dto/get-device-mobile-traffic-history-response.dto'
import { KafkaTopics } from '@company-name/cloud-core/dist/interfaces/kafka-topics'
@Controller('mobile-traffic')
@ApiTags('mobile-traffic')
export class DeviceMobileTrafficController {
  private readonly logger: Logger = new Logger(
    DeviceMobileTrafficController.name,
  )

  constructor(
    private readonly deviceMobileTrafficService: DeviceMobileTrafficService,
  ) {}

  @Get(':imei/billingDate/:billingDate')
  @ApiParam({ name: 'imei', example: '131313' })
  @ApiParam({ name: 'billingDate', example: '2023-01-18' })
  @ApiOperation({ description: 'Get mobile traffic per imei and billing date' })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: GetDeviceMobileTrafficResponseDto,
  })
  async getActualData(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
    @Param('billingDate') billingDate: string,
  ) {
    const { requestId } = req
    this.logger.log({
      message: 'Get mobile traffic',
      method: this.getActualData.name,
      imei,
      requestId,
    })
    return await this.deviceMobileTrafficService.getActualData(
      imei,
      billingDate,
      requestId,
    )
  }

  @Get('/history/:imei')
  @ApiParam({ name: 'imei', example: '131313' })
  @ApiOperation({ description: 'Get mobile traffic history per imei' })
  @ApiResponse({
    status: 200,
    description: 'Success operation',
    type: GetDeviceMobileTrafficHistoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
    type: NotFoundErrorDto,
  })
  async getHistory(
    @Req() req: Request & { requestId: string },
    @Param('imei') imei: string,
  ) {
    const { requestId } = req
    this.logger.log({
      message: 'Get mobile traffic history',
      method: this.getActualData.name,
      imei,
      requestId,
    })
    return await this.deviceMobileTrafficService.getHistory(imei, requestId)
  }

  @EventPattern(KafkaTopics.deviceDataDiagnostics)
  async processDeviceDiagnostics(
    @Payload() message: IncomingKafkaMessage<any, string>,
  ): Promise<void> {
    const requestId = randomUUID()
    const imei = message.key
    const data = message.value
    //The params are divided in the device side by 1024 * 1024
    const dividedUsageTx = data.dataUsageTx
    const dividedUsageRx = data.dataUsageRx
    const dataUsageTx = data.dataUsageTx * 1024 * 1024
    const dataUsageRx = data.dataUsageRx * 1024 * 1024
    try {
      this.logger.log({
        message: 'Received diagnostics message from device',
        method: this.processDeviceDiagnostics.name,
        imei,
        requestId,
        kafkaMessage: message,
        dividedUsageTx,
        dividedUsageRx,
        dataUsageTx,
        dataUsageRx,
      })
      await this.deviceMobileTrafficService.createOrUpdate(
        {
          imei,
          dataUsageTx,
          dataUsageRx,
          createdDate: moment().utc().format('YYYY-MM-DD'),
        },
        requestId,
      )
    } catch (error) {
      this.logger.error({
        message: 'Failure while handling kafka message',
        method: this.processDeviceDiagnostics.name,
        err: error || null,
        topic: KafkaTopics.deviceDataDiagnostics,
        imei,
        kafkaMessage: message,
        requestId,
      })
    }
  }

  @Post()
  @Header('content-type', 'application/json')
  async create(@Body() data): Promise<void> {
    const requestId = randomUUID()
    const imei = data.key
    try {
      console.log({
        message: 'Simulated receiving MobileTraffic data from device',
        method: this.processDeviceDiagnostics.name,
        imei,
        dataUsageTx: data.dataUsageTx,
        dataUsageRx: data.dataUsageRx,
        requestId,
      })
      await this.deviceMobileTrafficService.createOrUpdate(
        {
          imei,
          dataUsageTx: data.dataUsageTx,
          dataUsageRx: data.dataUsageRx,
          createdDate: moment().utc().format('YYYY-MM-DD'),
        },
        requestId,
      )
    } catch (error) {
      this.logger.error({
        message: 'Failure while simulate receiving MobileTraffic data',
        method: this.processDeviceDiagnostics.name,
        err: error || null,
        topic: KafkaTopics.deviceDataDiagnostics,
        imei,
        requestId,
      })
    }
  }
}
