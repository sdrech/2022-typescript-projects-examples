import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import moment from 'moment'

import {
  DeviceMobileTraffic,
  DeviceMobileTrafficDocument,
} from './entities/device-mobile-traffic.entity'
import { MobileTrafficDto } from './dto/create-or-update-device-mobile-traffic.dto'
import { DeviceMobileTrafficResponseParams } from './dto/get-device-mobile-traffic-response.dto'
import { MONGO_ORDER_BY_ASC, MONGO_ORDER_BY_DESC } from '../constants'

@Injectable()
export class DeviceMobileTrafficService {
  private readonly logger: Logger = new Logger(DeviceMobileTrafficService.name)

  constructor(
    @InjectModel(DeviceMobileTraffic.name)
    private readonly deviceMobileTrafficModel: Model<DeviceMobileTrafficDocument>,
  ) {}

  async createOrUpdate(
    mobileTrafficDto: MobileTrafficDto,
    requestId: string,
  ): Promise<void> {
    const { imei } = mobileTrafficDto
    try {
      this.logger.log({
        message: 'Trying to save a mobile traffic document',
        method: this.createOrUpdate.name,
        imei,
        mobileTrafficDto,
        requestId,
      })

      const updatedMobileTraffic = await this.deviceMobileTrafficModel
        .findOneAndUpdate(
          { imei, createdDate: moment().utc().format('YYYY-MM-DD') },
          { $set: mobileTrafficDto },
          { sort: { updatedAt: MONGO_ORDER_BY_DESC }, upsert: true, new: true },
        )
        .exec()

      this.logger.log({
        message: 'Successfully saved a mobile traffic document',
        method: this.createOrUpdate.name,
        imei,
        mobileTrafficDto,
        updatedMobileTraffic,
        requestId,
      })
    } catch (error) {
      this.logger.error({
        message: 'Failed to save a mobile traffic document',
        method: this.createOrUpdate.name,
        imei,
        mobileTrafficDto,
        error,
        requestId,
      })
    }
  }

  async getActualData(
    imei: string,
    billingDate: string,
    requestId: string,
  ): Promise<DeviceMobileTrafficResponseParams | null> {
    this.logger.log({
      message: 'Trying to get the last mobile traffic document',
      method: this.getActualData.name,
      imei,
      billingDate,
      requestId,
    })
    const lastMobileTraffic = await this.deviceMobileTrafficModel
      .findOne({ imei }, [], { sort: { updatedAt: MONGO_ORDER_BY_DESC } })
      .exec()
    if (!lastMobileTraffic) {
      this.logger.warn({
        message:
          'Failed to find the last mobile traffic document, returning null value instead',
        method: this.getActualData.name,
        imei,
        requestId,
      })

      return null
    }
    this.logger.log({
      message:
        'Successfully found the last mobile traffic document. Trying to get the last mobile traffic before the last billing date',
      method: this.getActualData.name,
      imei,
      requestId,
      lastMobileTraffic,
    })
    if (lastMobileTraffic.createdDate < billingDate.substring(0, 10)) {
      // validation format: 'YYYY-MM-DD'
      const dataUsageRx = 0
      const dataUsageTx = 0
      this.logger.log({
        message:
          'Last mobile traffic created before last billing day, hence the parameters set to zeros',
        method: this.getActualData.name,
        imei,
        requestId,
        lastMobileTrafficCreatedDate: lastMobileTraffic.createdDate,
        billingDate,
        dataUsageRx,
        dataUsageTx,
      })
      return {
        dataUsageRx,
        dataUsageTx,
      }
    }
    const mobileTrafficBeforeLastBillingDate =
      await this.deviceMobileTrafficModel
        .findOne({ imei, updatedAt: { $lt: billingDate } }, [], {
          sort: { updatedAt: MONGO_ORDER_BY_DESC },
        })
        .exec()
    this.logger.log({
      message:
        'Successfully found the last mobile traffic before the last billing date',
      method: this.getActualData.name,
      imei,
      requestId,
      mobileTrafficBeforeLastBillingDate,
    })

    const lastDataUsageTx = lastMobileTraffic.dataUsageTx
    const billingDayDataUsageTx =
      mobileTrafficBeforeLastBillingDate &&
      mobileTrafficBeforeLastBillingDate.dataUsageTx <= lastDataUsageTx // equal-sign (in "<=") is needed for the 1st request after billing day
        ? mobileTrafficBeforeLastBillingDate.dataUsageTx
        : 0
    const lastDataUsageRx = lastMobileTraffic.dataUsageRx
    const billingDayDataUsageRx =
      mobileTrafficBeforeLastBillingDate &&
      mobileTrafficBeforeLastBillingDate.dataUsageRx <= lastDataUsageRx // equal-sign (in "<=") is needed for the 1st request after billing day
        ? mobileTrafficBeforeLastBillingDate.dataUsageRx
        : 0
    // having equal-sign (in "<=" validation above) we will receive dataUsage=0 for the 1st request after billing day
    const dataUsageTx = lastDataUsageTx - billingDayDataUsageTx
    const dataUsageRx = lastDataUsageRx - billingDayDataUsageRx

    const mobileTraffic = {
      dataUsageRx,
      dataUsageTx,
    }
    this.logger.log({
      message: 'The mobile traffic from the begining of the month',
      method: this.getActualData.name,
      imei,
      requestId,
      mobileTrafficBeforeLastBillingDate,
      lastMobileTraffic,
      mobileTraffic,
    })
    return mobileTraffic
  }

  async getHistory(
    imei: string,
    requestId: string,
  ): Promise<DeviceMobileTrafficDocument[]> {
    this.logger.log({
      message: 'Trying to get mobile traffic history',
      method: this.getHistory.name,
      imei,
      requestId,
    })
    const mobileTrafficHistory = await this.deviceMobileTrafficModel
      .find(
        { imei },
        { imei: 0, _id: 0 },
        { sort: { updatedAt: MONGO_ORDER_BY_ASC } },
      )
      .exec()
    if (!mobileTrafficHistory.length) {
      this.logger.warn({
        message: 'Mobile traffic history not found',
        method: this.getHistory.name,
        imei,
        requestId,
      })

      return []
    }
    this.logger.log({
      message: 'Successfully found mobile traffic history',
      method: this.getHistory.name,
      imei,
      requestId,
      mobileTrafficHistory,
    })

    return mobileTrafficHistory
  }
}
