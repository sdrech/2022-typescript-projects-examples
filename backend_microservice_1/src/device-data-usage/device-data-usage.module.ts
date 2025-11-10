import { Module } from '@nestjs/common'
import { DeviceDataUsageService } from './device-data-usage.service'
import { DeviceDataUsageController } from './device-data-usage.controller'
import { MongooseModule } from '@nestjs/mongoose'
import {
  DeviceDataUsage,
  DeviceDataUsageSchema,
} from './entities/device-data-usage.entity'
import { HttpModule } from '@nestjs/axios'
import { ScheduleModule } from '@nestjs/schedule'
import { DeviceMobileTrafficModule } from '../device-mobile-traffic/device-mobile-traffic.module'
import { RetryableProcessModule } from '../retryable-process/retryable-process.module'

@Module({
  controllers: [DeviceDataUsageController],
  providers: [DeviceDataUsageService],
  imports: [
    MongooseModule.forFeature([
      { name: DeviceDataUsage.name, schema: DeviceDataUsageSchema },
    ]),
    HttpModule,
    ScheduleModule.forRoot(),
    DeviceMobileTrafficModule,
    RetryableProcessModule,
  ],
  exports: [DeviceDataUsageService],
})
export class DeviceDataUsageModule {}
