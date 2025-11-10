import { MockModel } from './database/mock.model'
import { DeviceDataUsage } from '../../src/device-data-usage/entities/device-data-usage.entity'
import { deviceDataUsageStub } from '../stubs/device-data-usage.stub'

export class DeviceDataUsageModelMock extends MockModel<DeviceDataUsage> {
  protected entityStub: DeviceDataUsage = deviceDataUsageStub()
}
