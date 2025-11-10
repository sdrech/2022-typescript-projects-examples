import { MockModel } from './database/mock.model'
import { DeviceMobileTraffic } from '../../src/device-mobile-traffic/entities/device-mobile-traffic.entity'
import { DeviceMobileTrafficStub } from '../stubs/device-mobile-traffic.stub'

export class DeviceMobileTrafficModelMock extends MockModel<DeviceMobileTraffic> {
  protected entityStub: DeviceMobileTraffic = DeviceMobileTrafficStub()
}
