import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { CreateDeviceDataUsageDto } from './dto/create-device-data-usage.dto'
import { IncreaseDataUsageCountersDto } from './dto/increase-data-usage-counters.dto'
import { InjectModel } from '@nestjs/mongoose'
import {
  DeviceDataUsage,
  DeviceDataUsageDocument,
} from './entities/device-data-usage.entity'
import { Model } from 'mongoose'
import {
  UnknownError,
  ResourceNotFoundError,
} from '@company-name/cloud-core/dist/errors'
import {
  DATA_PROFILE_LIMITATION_URL,
  MONGO_ORDER_BY_ASC,
  MONGO_ORDER_BY_DESC,
  UNLIMITED_USAGE,
} from '../constants'
import { firstValueFrom } from 'rxjs'
import { HttpService } from '@nestjs/axios'
import { AxiosRequestConfig } from 'axios'
import { format } from 'util'
import {
  defaultDataUsage,
  defaultDataUsageDailyCounters,
  defaultDataUsageMonthlyCounters,
} from './device-data-usage.constants'
import { IDataUsage } from './device-data-usage.interface'
import {
  IDataUsageLimitation,
  IDataUsageLimitationRes,
} from '@company-name/cloud-core/dist/interfaces/data-usage'
import * as https from 'https'
import { DeviceMobileTrafficService } from '../device-mobile-traffic/device-mobile-traffic.service'
import { DeviceMobileTrafficResponseParams } from '../device-mobile-traffic/dto/get-device-mobile-traffic-response.dto'
import { DeviceMobileTrafficDocument } from '../device-mobile-traffic/entities/device-mobile-traffic.entity'
import { DeviceDataUsageHistoryResponseParams } from './dto/get-device-data-usage-history-response.dto'
import { RetryableProcessService } from '../retryable-process/retryable-process.service'

@Injectable()
export class DeviceDataUsageService {
  private readonly logger: Logger = new Logger(DeviceDataUsageService.name)

  constructor(
    @InjectModel(DeviceDataUsage.name)
    private readonly deviceDataUsageModel: Model<DeviceDataUsageDocument>,
    private readonly httpService: HttpService,
    private readonly deviceMobileTrafficService: DeviceMobileTrafficService,
    private readonly retryableProcessService: RetryableProcessService,
  ) {}

  /**
   * Method is not used by the product needs, only for service usage (as for January-2022)
   */
  async create(
    data: CreateDeviceDataUsageDto,
    requestId?: string,
  ): Promise<DeviceDataUsageDocument> {
    const { imei } = data
    try {
      return await this.deviceDataUsageModel.create(data)
    } catch (error) {
      this.logger.error({
        method: this.create.name,
        message: 'Cannot create new record DataUsageHistory',
        error,
        imei,
        data,
        requestId,
      })
      throw new UnknownError(
        `Cannot create new DataUsageHistory record for ${imei}`,
      )
    }
  }

  /**
   * Get full history of DeviceDataUsage for the specific device
   */
  async findManyByImei(
    imei: string,
    requestId: string,
  ): Promise<DeviceDataUsageDocument[]> {
    try {
      const dataUsageHistory = await this.deviceDataUsageModel
        .find({ imei })
        .sort({ updatedAt: MONGO_ORDER_BY_ASC })
        .exec()

      this.logger.log({
        message: 'Successfully got response from db',
        method: this.findManyByImei.name,
        imei,
        dataUsage: dataUsageHistory,
        requestId,
      })
      return dataUsageHistory
    } catch (error) {
      this.logger.error({
        message: 'Unexpected Error in DataUsageHistory',
        method: this.findManyByImei.name,
        imei,
        error,
        requestId,
      })
      throw new UnknownError(
        `Cannot get records for ${imei} in DataUsageHistory`,
      )
    }
  }

  /**
   * Get single the latest version of DeviceDataUsage-object
   * @link getActualOne() - extended method
   */
  async findLastOne(
    imei: string,
    requestId: string,
    isStrictSearch = true,
  ): Promise<DeviceDataUsageDocument | undefined> {
    let dataUsage: DeviceDataUsageDocument[], errorMessage: string
    try {
      this.logger.log({
        message: 'Trying to get the last common data usage',
        method: this.findLastOne.name,
        imei,
        isStrictSearch,
        requestId,
      })
      dataUsage = await this.deviceDataUsageModel
        .find({ imei }, { _id: 0 })
        .sort({ updatedAt: MONGO_ORDER_BY_DESC })
        .limit(1)
        .exec()
      if (isStrictSearch && (!dataUsage || !dataUsage.length)) {
        errorMessage = 'Data usage not found'
        throw new ResourceNotFoundError(`${errorMessage} for ${imei}`)
      }

      this.logger.log({
        message: 'Successfully got the last common data usage',
        method: this.findLastOne.name,
        imei,
        dataUsage,
        requestId,
        isStrictSearch,
      })
      return dataUsage[0]
    } catch (error) {
      this.logger.error({
        message: 'Failed while trying to get the last common data usage',
        method: this.findLastOne.name,
        imei,
        requestId,
        isStrictSearch,
        error,
      })
      if (error instanceof ResourceNotFoundError) {
        throw new ResourceNotFoundError(error.message)
      }
      throw new UnknownError(
        `Cannot get the last common data usage record for ${imei}`,
      )
    }
  }

  /**
   * Get merged common DataUsageHistory and MobileTraffic fresh counters.
   * Returns the last version of counters with refreshed/zeroed values (if needed).
   * It never updates the data in DB, it can only modify the response on the fly
   */
  async getFullActualOne(
    imei: string,
    billingDay: number,
    requestId: string,
  ): Promise<DeviceDataUsage & DeviceMobileTrafficResponseParams> {
    this.logger.log({
      message:
        'Trying to get full data usage including common data and mobile traffic',
      method: this.getFullActualOne.name,
      imei,
      requestId,
    })

    let commonDataUsage: DeviceDataUsage,
      mobileTrafficUsage: DeviceMobileTrafficResponseParams
    try {
      commonDataUsage = await this.getActualOne(imei, requestId, billingDay)
      let countersStartingDate =
        this.getLastBillingFullDate(billingDay).toISOString()
      if (commonDataUsage.resetRequestedAt) {
        const resetCountersRequestedAt = new Date(
          commonDataUsage.resetRequestedAt,
        ).toISOString()
        countersStartingDate =
          resetCountersRequestedAt > countersStartingDate
            ? resetCountersRequestedAt
            : countersStartingDate
      }
      mobileTrafficUsage = await this.deviceMobileTrafficService.getActualData(
        imei,
        countersStartingDate,
        requestId,
      )

      const fullDataUsage = {
        ...commonDataUsage,
        ...mobileTrafficUsage,
      }
      this.logger.log({
        message:
          'Successfully got full data usage including common data and mobile traffic',
        method: this.getFullActualOne.name,
        imei,
        requestId,
        fullDataUsage,
      })

      return fullDataUsage
    } catch (error) {
      this.logger.error({
        method: this.getFullActualOne.name,
        message:
          'Exception in merging counters of DataUsageHistory and MobileTraffic',
        error,
        imei,
        commonDataUsage,
        mobileTrafficUsage,
        requestId,
      })
      throw new UnknownError(
        `Cannot get actual counters for ${imei} in merged data`,
      )
    }
  }

  /**
   * Get default data usage document for imei
   */
  async getDefaultOne(imei: string, requestId: string, billingDay?: number) {
    try {
      if (!billingDay) {
        billingDay = (await this.getDataProfileLimitation(imei, requestId)).data
          .billingDayOfMonth
      }
      return new DeviceDataUsage(
        {
          imei,
          ...defaultDataUsage,
        } as IDataUsage,
        billingDay,
      )
    } catch (err) {
      this.logger.error({
        method: this.getDefaultOne.name,
        message: 'Unexpected error',
        err,
        imei,
        requestId,
        billingDay: billingDay || null,
      })
      throw err
    }
  }

  /**
   * Get the last version of DeviceDataUsage-object with refreshed/zeroed counters (if needed).
   * It never updates the data in DB, it can only modify the response on the fly
   */
  async getActualOne(
    imei: string,
    requestId: string,
    billingDay?: number,
  ): Promise<DeviceDataUsage> {
    let dataUsageModel: DeviceDataUsageDocument, dataUsage: DeviceDataUsage
    try {
      dataUsageModel = await this.findLastOne(imei, requestId, false)
      if (!dataUsageModel) {
        dataUsage = await this.getDefaultOne(imei, requestId, billingDay)
        this.logger.log({
          message: 'Data usage record is not found. Generating a default one',
          method: this.getActualOne.name,
          imei,
          dataUsage,
          requestId,
        })
        return dataUsage
      }

      dataUsage = this.getFreshData(
        dataUsageModel,
        billingDay || dataUsageModel.billingDay,
        requestId,
      )
      this.logger.log({
        message:
          'Data usage before (initialDataUsage) and after (updatedDataUsage) validation',
        method: this.getActualOne.name,
        imei,
        initialDataUsage: dataUsageModel,
        updatedDataUsage: dataUsage,
        requestId,
      })
      return dataUsage
    } catch (error) {
      this.logger.error({
        method: this.getActualOne.name,
        message: 'Exception in getting updated DataUsage counters',
        error,
        imei,
        dataUsage,
        requestId,
      })
      return dataUsage
    }
  }

  /**
   * Method validates all meaningful data and refreshes them (if needed)
   */
  private getFreshData(
    dataUsageModel: DeviceDataUsageDocument,
    billingDay: number,
    requestId: string,
  ): DeviceDataUsage {
    // 'dataUsage' should be pure document without Mongoose stuff
    let dataUsage = JSON.parse(JSON.stringify(dataUsageModel))
    if (dataUsage._id) {
      delete dataUsage._id
    }
    dataUsage = this.getFreshDailyCounters(dataUsage, requestId)
    dataUsage = this.getFreshMonthlyCountersAndBillingDay(
      dataUsage,
      billingDay,
      requestId,
    )
    return dataUsage
  }

  /**
   * Method validates and refreshes (if needed) daily counters (like totalVideoEventsToday)
   */
  private getFreshDailyCounters(
    oldDataUsage: DeviceDataUsage,
    requestId: string,
  ): DeviceDataUsage {
    const { lastUpdateEventsCounters, imei } = oldDataUsage
    const UTCLastUpdateEventsCounters = new Date(lastUpdateEventsCounters)
    const UTCLastMidnight = new Date(new Date().setUTCHours(0, 0, 0, 0))
    const UTCCurrentDate = new Date()

    if (
      !(
        UTCLastUpdateEventsCounters < UTCLastMidnight &&
        UTCLastMidnight < UTCCurrentDate
      )
    ) {
      return oldDataUsage
    }

    this.logger.log({
      message:
        'Daily counters of data usage must be reset [because UTCLastUpdateEventsCounters < UTCLastMidnight < UTCCurrentDate]',
      method: this.getFreshDailyCounters.name,
      imei,
      oldDataUsage,
      UTCCurrentDate,
      UTCLastMidnight,
      UTCLastUpdateEventsCounters,
      requestId,
    })
    return {
      ...oldDataUsage,
      ...defaultDataUsageDailyCounters,
    } as DeviceDataUsageDocument
  }

  /**
   * Method validates and refreshes (if needed) billingDay and monthly counters
   */
  private getFreshMonthlyCountersAndBillingDay(
    oldDataUsage: DeviceDataUsage,
    billingDay: number,
    requestId: string,
  ): DeviceDataUsage {
    const { updatedAt, billingDay: storedBillingDay, imei } = oldDataUsage

    if (billingDay !== storedBillingDay) {
      this.logger.log({
        message:
          'Billing day is changed, so it and monthly counters have to be reset',
        method: this.getFreshMonthlyCountersAndBillingDay.name,
        newBillingDay: billingDay,
        storedBillingDay,
        imei,
        requestId,
      })
      return {
        ...oldDataUsage,
        ...defaultDataUsage,
        billingDay,
        resetRequestedAt: new Date(),
      } as DeviceDataUsageDocument
    }

    const UTCLastUpdatingDate = new Date(updatedAt)
    const UTCBillingDate = this.getLastBillingFullDate(billingDay)
    if (UTCLastUpdatingDate > UTCBillingDate) {
      return oldDataUsage
    }

    this.logger.log({
      message:
        'Monthly counters of data usage must be reset [because lastUTCUpdatedDate < UTCBillingDate < UTCCurrentDate]',
      method: this.getFreshMonthlyCountersAndBillingDay.name,
      imei,
      oldDataUsage,
      UTCBillingDate,
      UTCLastUpdatingDate,
      requestId,
    })
    return {
      ...oldDataUsage,
      ...defaultDataUsageMonthlyCounters,
    } as DeviceDataUsageDocument
  }

  /**
   * Increase counters for DeviceDataUsage by provided delta values
   *
   * @returns an error when there is no existent record in the DB
   * @returns DeviceDataUsage when success
   */
  async increaseCounters(
    imei: string,
    data: IncreaseDataUsageCountersDto,
    requestId: string,
    actualDataUsage?: DeviceDataUsage,
  ): Promise<DeviceDataUsage> {
    const {
      liveStreamingSecondsThisMonth: liveStreamingSecondsThisMonthDelta,
      recordStreamingSecondsThisMonth: recordStreamingSecondsThisMonthDelta,
      totalVideoEventsThisMonth: totalVideoEventsThisMonthDelta,
      totalVideoEventsToday: totalVideoEventsTodayDelta,
      eventsBytesThisMonth: eventBytesDelta,
      recordingsUploadBytesThisMonth: recordingsUploadBytesThisMonthDelta,
      recordStreamingBytesThisMonth: recordStreamingBytesThisMonthDelta,
      liveStreamingBytesThisMonth: liveStreamingBytesThisMonthDelta,
      billingDay,
    } = data
    this.logger.log({
      message: 'Trying to increase data usage counters',
      method: this.increaseCounters.name,
      imei,
      liveStreamingSecondsThisMonthDelta,
      recordStreamingSecondsThisMonthDelta,
      totalVideoEventsThisMonthDelta,
      totalVideoEventsTodayDelta,
      recordingsUploadBytesThisMonthDelta,
      recordStreamingBytesThisMonthDelta,
      liveStreamingBytesThisMonthDelta,
      billingDay,
      requestId,
    })
    if (
      !liveStreamingSecondsThisMonthDelta &&
      !recordStreamingSecondsThisMonthDelta &&
      !totalVideoEventsThisMonthDelta &&
      !eventBytesDelta &&
      !recordingsUploadBytesThisMonthDelta &&
      !recordStreamingBytesThisMonthDelta &&
      !liveStreamingBytesThisMonthDelta &&
      !totalVideoEventsTodayDelta
    ) {
      throw new BadRequestException('Nothing to update')
    }

    if (!actualDataUsage) {
      actualDataUsage = await this.getActualOne(imei, requestId, billingDay)
    }
    actualDataUsage = {
      ...actualDataUsage,
      liveStreamingSecondsThisMonth:
        actualDataUsage.liveStreamingSecondsThisMonth +
        (liveStreamingSecondsThisMonthDelta || 0),
      recordStreamingSecondsThisMonth:
        actualDataUsage.recordStreamingSecondsThisMonth +
        (recordStreamingSecondsThisMonthDelta || 0),
      totalVideoEventsToday:
        actualDataUsage.totalVideoEventsToday +
        (totalVideoEventsTodayDelta || 0),
      totalVideoEventsThisMonth:
        actualDataUsage.totalVideoEventsThisMonth +
        (totalVideoEventsThisMonthDelta || 0),
      eventsBytesThisMonth:
        (actualDataUsage.eventsBytesThisMonth || 0) + (eventBytesDelta || 0),
      recordStreamingBytesThisMonth:
        (actualDataUsage.recordStreamingBytesThisMonth || 0) +
        (recordStreamingBytesThisMonthDelta || 0),
      recordingsUploadBytesThisMonth:
        (actualDataUsage.recordingsUploadBytesThisMonth || 0) +
        (recordingsUploadBytesThisMonthDelta || 0),
      liveStreamingBytesThisMonth:
        (actualDataUsage.liveStreamingBytesThisMonth || 0) +
        (liveStreamingBytesThisMonthDelta || 0),
      lastUpdateEventsCounters:
        totalVideoEventsTodayDelta || totalVideoEventsThisMonthDelta
          ? new Date().toISOString()
          : actualDataUsage.lastUpdateEventsCounters,
    }

    await this.deviceDataUsageModel.create(actualDataUsage)
    this.logger.log({
      message: 'Successfully increased data usage counters',
      method: this.increaseCounters.name,
      imei,
      actualDataUsage,
      requestId,
    })
    return actualDataUsage
  }

  /**
   * Get DataProfile settings from Monolith
   */
  async getDataProfileLimitation(
    imei: string,
    requestId: string,
  ): Promise<IDataUsageLimitationRes> {
    const url = format(
      DATA_PROFILE_LIMITATION_URL,
      process.env.DEVICE_MANAGER_API_PROTOCOL,
      process.env.DEVICE_MANAGER_API_HOST,
      imei,
    )
    const requestOptions: AxiosRequestConfig = {
      headers: { 'x-request-id': requestId },
    }
    if (process.env.DEVICE_MANAGER_API_PROTOCOL === 'https') {
      requestOptions.httpsAgent = new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV !== 'development',
      })
    }
    try {
      this.logger.log({
        message: 'Trying to get DataProfile limits from monolith',
        method: this.getDataProfileLimitation.name,
        url,
        imei,
        requestId,
        requestOptions,
      })
      const { data: dataUsageLimitation } = await firstValueFrom(
        this.httpService.get(url, requestOptions),
      )
      this.logger.log({
        message: 'Successfully got DataProfile limits from monolith',
        method: this.getDataProfileLimitation.name,
        url,
        imei,
        dataUsageLimitation,
        requestId,
      })
      return dataUsageLimitation
    } catch (error) {
      this.logger.error({
        message: 'Exception in getting DataProfile limits from monolith',
        method: this.getDataProfileLimitation.name,
        error,
        url,
        imei,
        requestId,
        requestOptions,
      })
    }
  }

  /**
   * Compare event-counters with DataProfile limitation, and increase event-counters if allowed
   *
   * @returns true - when nothing is updated in the DB because the limits are reached,
   * @returns false - when counters are increased in the DB as limits are not reached
   *
   * @todo rename this method to "increaseEventCountersIfAllowed()" due to inversion between the logic vs returning type of the method
   * @todo switch output-values true/false to match new method-name; update linked functionality to keep backward compatibility
   * @example recommended to return "true" when data is update and "false" when nothing is updated
   *
   * @alias previous name: isDataUsageLimitReached()
   */
  async areEventLimitsReachedAndCountersNotIncreased(
    imei: string,
    requestId: string,
    dataProfileLimits?: IDataUsageLimitation,
  ): Promise<boolean> {
    let isEventsLimitsReached = true
    try {
      if (!dataProfileLimits) {
        const { data } = await this.getDataProfileLimitation(imei, requestId)
        dataProfileLimits = data
      }
      const {
        billingDayOfMonth,
        videoEventsDay: eventsDailyLimit,
        videoEventsMonth: eventsMonthlyLimit,
      } = dataProfileLimits

      let totalVideoEventsToday: number,
        totalVideoEventsThisMonth: number,
        message: string
      const unlimitedMonthlyUsage = eventsMonthlyLimit === UNLIMITED_USAGE
      const unlimitedDailyUsage = eventsDailyLimit === UNLIMITED_USAGE
      const dataUsage = await this.getActualOne(
        imei,
        requestId,
        billingDayOfMonth,
      )
      if (!unlimitedMonthlyUsage || !unlimitedDailyUsage) {
        totalVideoEventsToday = dataUsage.totalVideoEventsToday
        totalVideoEventsThisMonth = dataUsage.totalVideoEventsThisMonth
      }

      switch (true) {
        case unlimitedMonthlyUsage && unlimitedDailyUsage:
          isEventsLimitsReached = false
          message = 'There are no limitations for this imei'
          break
        case !unlimitedDailyUsage &&
          totalVideoEventsToday + 1 > eventsDailyLimit:
        // no break here because we need to verify the following MonthlyUsage as well
        case !unlimitedMonthlyUsage &&
          totalVideoEventsThisMonth + 1 > eventsMonthlyLimit:
          isEventsLimitsReached = true
          message = 'Data usage has reached the limit'
          break
        case totalVideoEventsToday + 1 <= eventsDailyLimit &&
          totalVideoEventsThisMonth + 1 <= eventsMonthlyLimit:
          isEventsLimitsReached = false
          message = 'Data usage limits are verified'
          break
        case unlimitedMonthlyUsage &&
          totalVideoEventsToday + 1 <= eventsDailyLimit:
          isEventsLimitsReached = false
          message = 'Data usage daily limit is verified'
          break
        case unlimitedDailyUsage &&
          totalVideoEventsThisMonth + 1 <= eventsMonthlyLimit:
          isEventsLimitsReached = false
          message = 'Data usage monthly limit is verified'
          break
      }

      this.logger.log({
        message,
        method: this.areEventLimitsReachedAndCountersNotIncreased.name,
        imei,
        unlimitedMonthlyUsage,
        unlimitedDailyUsage,
        eventsDailyLimit,
        eventsMonthlyLimit,
        billingDayOfMonth,
        totalVideoEventsToday,
        totalVideoEventsThisMonth,
        requestId,
      })

      if (isEventsLimitsReached) {
        return true
      }

      await this.increaseCounters(
        imei,
        {
          totalVideoEventsToday: 1,
          totalVideoEventsThisMonth: 1,
          billingDay: billingDayOfMonth,
        } as IncreaseDataUsageCountersDto,
        requestId,
        dataUsage,
      )
      return false
    } catch (error) {
      this.logger.error({
        message: 'Exception in increasing DataUsage counters attempt',
        error,
        method: this.areEventLimitsReachedAndCountersNotIncreased.name,
        imei,
        requestId,
      })
      return true
    }
  }

  /**
   * Remove all records for the specific imei, NOT strict
   * @returns amount of deleted records
   */
  async remove(
    imei: string,
    requestId: string = null,
  ): Promise<{ deletedCount: number }> {
    try {
      const { deletedCount } = await this.deviceDataUsageModel
        .deleteMany({ imei })
        .exec()
      if (!deletedCount) {
        throw new ResourceNotFoundError(imei)
      }
      this.logger.log({
        message: 'DataUsageHistory is successfully removed from MongoDB',
        method: this.remove.name,
        imei,
        deletedCount,
        requestId,
      })
      return { deletedCount }
    } catch (error) {
      this.logger.log({
        message:
          'DataUsageHistory is not found for a single device, so nothing to remove from MongoDB',
        method: this.remove.name,
        imei,
        error,
        requestId,
      })
      return { deletedCount: 0 }
    }
  }

  /**
   * Remove all records for the list of devices/imeis, NOT strict
   * @returns amount of deleted records
   */
  async removeMany(
    imeis: string[],
    requestId: string = null,
  ): Promise<{ deletedCount: number }> {
    try {
      const { deletedCount } = await this.deviceDataUsageModel
        .deleteMany({ imei: { $in: imeis } })
        .exec()
      if (!deletedCount) {
        throw new ResourceNotFoundError(imeis.toString())
      }
      this.logger.log({
        message:
          'DataUsageHistory for many devices is successfully removed from MongoDB',
        method: this.removeMany.name,
        imeis,
        deletedCount,
        requestId,
      })
      return { deletedCount }
    } catch (error) {
      if (!imeis || !imeis.length) {
        this.logger.log({
          message:
            'No DataUsageHistory is found for many devices, so nothing to remove from MongoDB',
          method: this.removeMany.name,
          imeis,
          error,
          requestId,
        })
      } else {
        imeis.forEach((imei) => {
          this.logger.log({
            message:
              'No DataUsageHistory is found for many devices, so nothing to remove from MongoDB',
            method: this.removeMany.name,
            imei,
            error,
            requestId,
          })
        })
      }
      return { deletedCount: 0 }
    }
  }

  async getHistory(
    imei: string,
    requestId: string,
  ): Promise<DeviceDataUsageHistoryResponseParams[]> {
    const [commonDataUsageDocs, mobileTrafficDocs] = await Promise.all([
      this.findManyByImei(imei, requestId),
      this.deviceMobileTrafficService.getHistory(imei, requestId),
    ])
    const result: DeviceDataUsageHistoryResponseParams[] = []
    const item: DeviceDataUsageHistoryResponseParams = {
      dataUsageRx: null,
      dataUsageTx: null,
      eventsBytesThisMonth: 0,
      totalVideoEventsToday: 0,
      totalVideoEventsThisMonth: 0,
      liveStreamingSecondsThisMonth: 0,
      liveStreamingBytesThisMonth: 0,
      recordStreamingSecondsThisMonth: 0,
      recordStreamingBytesThisMonth: 0,
      updatedAt: null,
    }

    let i = 0,
      j = 0
    let cdu: DeviceDataUsageDocument, mt: DeviceMobileTrafficDocument
    try {
      while (i < commonDataUsageDocs.length || j < mobileTrafficDocs.length) {
        ;(cdu = undefined), (mt = undefined)
        if (
          !mobileTrafficDocs[j] ||
          (commonDataUsageDocs[i] &&
            commonDataUsageDocs[i].updatedAt < mobileTrafficDocs[j].updatedAt)
        ) {
          cdu = commonDataUsageDocs[i]
          i++
        } else if (
          !commonDataUsageDocs[i] ||
          (mobileTrafficDocs[j] &&
            mobileTrafficDocs[j].updatedAt < commonDataUsageDocs[i].updatedAt)
        ) {
          mt = mobileTrafficDocs[j]
          j++
        } else {
          cdu = commonDataUsageDocs[i]
          mt = mobileTrafficDocs[j]
          i++
          j++
        }

        if (cdu) {
          item.eventsBytesThisMonth = cdu.eventsBytesThisMonth || 0
          item.totalVideoEventsToday = cdu.totalVideoEventsToday
          item.totalVideoEventsThisMonth = cdu.totalVideoEventsThisMonth
          item.liveStreamingSecondsThisMonth = cdu.liveStreamingSecondsThisMonth
          item.liveStreamingBytesThisMonth =
            cdu.liveStreamingBytesThisMonth || 0
          item.recordStreamingSecondsThisMonth =
            cdu.recordStreamingSecondsThisMonth
          item.recordStreamingBytesThisMonth =
            cdu.recordStreamingBytesThisMonth || 0
          item.updatedAt = cdu.updatedAt
        }
        if (mt) {
          item.dataUsageRx = mt.dataUsageRx
          item.dataUsageTx = mt.dataUsageTx
          item.updatedAt = mt.updatedAt
        }
        result.push({ ...item })
      }

      const uniqueness =
        result.length /
        (commonDataUsageDocs.length + mobileTrafficDocs.length || 1)
      const info = {
        message: 'Data usage history array is successfully merged',
        method: this.getHistory.name,
        imei,
        commonDataUsageLength: commonDataUsageDocs.length,
        mobileTrafficLength: mobileTrafficDocs.length,
        usageHistoryLength: result.length,
        uniqueness,
        requestId,
      }
      if (uniqueness < 0.95) {
        this.logger.warn({
          ...info,
          comment:
            'timestamp of mobileTraffic and commonDataUsageLength documents are very similar',
        })
      } else {
        this.logger.log(info)
      }
      return result
    } catch (error) {
      this.logger.error({
        method: this.create.name,
        message: 'Cannot create new record DataUsageHistory',
        error,
        imei,
        commonDataUsageDocs, //  ToDo: this value could be removed from logs to save space on NewRelic
        mobileTrafficDocs, //  ToDo: this value could be removed from logs to save space on NewRelic
        commonDataUsageLength: commonDataUsageDocs.length,
        mobileTrafficLength: mobileTrafficDocs.length,
        usageHistoryLength: result.length,
        iterationDataUsage: i,
        iterationMobileTraffic: j,
        lastDataUsageDocument: cdu,
        lastMobileTrafficDocument: mt,
        requestId,
      })
      throw new UnknownError(
        `Cannot merge data of UsageHistory report for ${imei}`,
      )
    }
  }

  /**
   * Define the last UTC BillingDate based on current time
   */
  private getLastBillingFullDate(dayOfMonth: number): Date {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()
    const currentYear = now.getFullYear()

    if (currentDay < dayOfMonth) {
      if (currentMonth === 0) {
        // if current month is January
        now.setFullYear(currentYear - 1)
        now.setMonth(11)
      } else {
        now.setMonth(currentMonth - 1)
      }
    }

    now.setDate(dayOfMonth)
    now.setUTCHours(0, 0, 0, 0)
    return now
  }

  async saveUploadedBytes(
    imei: string,
    uploadedBytes: number,
    requestId: string,
  ) {
    if (!uploadedBytes || !(typeof uploadedBytes === 'number')) {
      this.logger.warn({
        message: 'Cannot save an empty value of uploadedBytes',
        imei,
        uploadedBytes,
        method: this.saveUploadedBytes.name,
        requestId,
      })
      return
    }

    let message: string
    let paramToIncrease: {
      eventsBytesThisMonth?: number
      recordStreamingBytesThisMonth?: number
    }

    this.logger.log({
      message:
        'Trying to check if snapshot event with the same requestId exists',
      imei,
      method: this.saveUploadedBytes.name,
      requestId,
    })

    const isSnapshotEventProcess =
      await this.retryableProcessService.isSnapshotProcessExist(requestId)

    if (isSnapshotEventProcess) {
      this.logger.log({
        message:
          'Successfully found that a snapshot event with the same requestId exists, hence we sould not count it',
        imei,
        method: this.saveUploadedBytes.name,
        requestId,
        isSnapshotEventProcess,
      })
      return
    }

    this.logger.log({
      message:
        'Successfully found that a snapshot event with the same requestId not exists. Trying to check if video event with the same requestId exists',
      imei,
      method: this.saveUploadedBytes.name,
      requestId,
    })

    const isVideoEventProcess =
      await this.retryableProcessService.isVideoProcessExist(requestId)

    this.logger.log({
      message:
        'Successfully checked if video event with the same requestId exists',
      imei,
      method: this.saveUploadedBytes.name,
      requestId,
      isVideoEventProcess,
    })

    if (isVideoEventProcess) {
      message = 'Trying to save uploadedBytes for event'
      paramToIncrease = {
        eventsBytesThisMonth: uploadedBytes,
      }
    } else {
      message = 'Trying to save uploadedBytes for recording streaming'
      paramToIncrease = {
        recordStreamingBytesThisMonth: uploadedBytes,
      }
    }

    this.logger.log({
      message,
      imei,
      method: this.saveUploadedBytes.name,
      requestId,
      uploadedBytes,
      paramToIncrease,
    })

    const actualDataUsage = await this.increaseCounters(
      imei,
      paramToIncrease,
      requestId,
    )

    this.logger.log({
      message: 'Successfully saved uploadedBytes in the data usage doc',
      imei,
      method: this.saveUploadedBytes.name,
      requestId,
      uploadedBytes,
      actualDataUsage,
      paramToIncrease,
    })
  }

  async createOne(imei: string, requestId: string) {
    const dataUsage = await this.getDefaultOne(imei, requestId)
    this.logger.log({
      message: 'Trying to create a default data usage record',
      imei,
      method: this.createOne.name,
      requestId,
      dataUsage,
    })
    await this.deviceDataUsageModel.create(dataUsage)
    this.logger.log({
      message: 'Successfully created a default data usage record',
      imei,
      method: this.createOne.name,
      requestId,
      dataUsage,
    })
  }
}
