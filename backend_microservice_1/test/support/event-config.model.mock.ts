import { MockModel } from './database/mock.model'
import { EventConfigEntity } from '../../src/event-config/schemas/event-config.schema'
import { eventConfigDataTypeSnapshotStub } from '../stubs/event-config.stub'

export class EventConfigModelMock extends MockModel<EventConfigEntity> {
  protected entityStub = eventConfigDataTypeSnapshotStub()

  populate(): this {
    return this
  }
}
