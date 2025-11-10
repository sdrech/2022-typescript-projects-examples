import { EventConfigEntity } from '../../src/event-config/schemas/event-config.schema'
import { EventType, DataTypes } from '@company-name/cloud-core/dist/interfaces/events'

export const eventConfigDataTypeSnapshotStub = (
  imei = '1234',
): EventConfigEntity => {
  return {
    imei,
    triggers: [
      {
        trigger_type: EventType.acceleration,
        data_type: DataTypes.snapshot,
      },
    ],
  }
}

export const eventConfigDataTypeVideoStub = (
  imei = '1234',
): EventConfigEntity => {
  return {
    imei,
    triggers: [
      {
        trigger_type: EventType.acceleration,
        data_type: DataTypes.video,
      },
    ],
  }
}
