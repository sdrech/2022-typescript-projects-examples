import { Transport } from '@nestjs/microservices'
import { KafkaOptions } from '@company-name/cloud-core/dist/interfaces/kafka-options'
import { logLevel } from '@nestjs/microservices/external/kafka.interface'
import { getBrokers } from '@company-name/cloud-core/dist/utils'
import { DeviceModel } from './retryable-process/entities/retryable-process.entity'

export const SERVICE_NAME = 'cloud-media-service'
export const KAFKA_VERSION = 1
export const OPENAPI_CONFIG = {
  title: 'Cloud Media service',
  description: 'Device Media docs.',
  version: '1.0',
  tags: [],
}

export const UPLOAD_DATA_V1_TYPE = 'uploaddatav1'
export const TOPIC_DEVICE_NOTIFY_EVENT = `device.notify.event.${KAFKA_VERSION}`
export const TOPIC_EVENT_PRE_SIGNED_LINK = `media.event.presignedlink.${KAFKA_VERSION}`
export const TOPIC_EVENT_SUBSCRIPTION = `command.subscription.${KAFKA_VERSION}`
export const DEVICE_COMMAND_TOPIC = `device.commandv${KAFKA_VERSION}`
export const CLOUD_FACTORY_RESET_RECEIVED_TOPIC = `cloud.factory-reset.received.${KAFKA_VERSION}`
export const TOPIC_DEVICE_POWER_STATE = `device.notify.power-state.${KAFKA_VERSION}`
export const TOPIC_DEVICE_DISCONNECTED = `device.notify.disconnected.${KAFKA_VERSION}`
export const TOPIC_DEVICE_UPLOAD_DATA_RESPONSE = 'command.upload-data.response'
export const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID ?? SERVICE_NAME
export const KAFKA_GROUP_ID = 'cloud-media-service'
export const KAFKA_CLIENT_TOKEN = 'KAFKA_SERVICE'
export const KAFKA_CONFIG: KafkaOptions = {
  transport: Transport.KAFKA,
  options: {
    client: {
      logLevel: logLevel.INFO,
      clientId: KAFKA_CLIENT_ID,
      brokers: getBrokers,
    },
    consumer: {
      groupId: KAFKA_GROUP_ID,
      allowAutoTopicCreation: false,
      maxBytesPerPartition: 1024,
    },
    run: {
      partitionsConsumedConcurrently: parseInt(
        process.env.KAFKA_PARTITION_CONSUMED_CONCURRENTLY ?? '1',
        10,
      ),
    },
  },
}
export const KAFKA_HEALTH_TIMEOUT = 10000
export const EVENT_VIDEO_DURATION_SEC = 10
export const DEFAULT_DEVICE_MODEL = DeviceModel.AI_14
export const AI_12_DEVICE_MODEL = DeviceModel.AI_12
export const TUNNEL_UPLOAD_STEP_NAME = 'tunnel-upload'

export const DEVICE_MEDIA_UPLOAD_NETWORK_ERROR_MIN = 2000
export const DEVICE_MEDIA_UPLOAD_NETWORK_ERROR_MAX = 4003
export const EXPIRED_LINK_TOKEN_CODE = 3000
export const ERROR_CODES_WITH_ATTEMPTS_LIMIT = [4000, 4003]
export const ERROR_CODES_ATTEMPTS_LIMIT = 3
export const ATTEMPTS_LIMIT_AI_12 = 5
export const secondsToSubtractFromEventVideoStart = (
  videoDurationInSec: number,
): number => {
  return Math.round(videoDurationInSec / 2)
}

export const GEO_FENCE_OUT_TYPE = 'GeoFenceOut'
export const GEO_FENCE_OUT_PATH = 'Out Of Fence'

export const DATA_PROFILE_LIMITATION_URL =
  '%s://%s/devicemanager_api/api/v1.1/device/%s/data-profile-limitation'
export const UNLIMITED_USAGE = -1
export const REDIS_NAMESPACE = 'media-redis'
export const VIDEO_EVENT_QUALITY_REDIS_KEY = 'eventVideoQuality:'

export const DEVICE_CONNECTIVITY_STATE_KEY = 'mqtt_user.%s'
export const DEVICE_STATE_FIELD = 'device-connectivity-state:state' // device power state
export const DEVICE_STATUS_FIELD = 'device-connectivity-state:status' // device status
export const CLOUD_CREATE_DEVICE_CONFIG_TOPIC = `cloud.deviceConfig.create.${KAFKA_VERSION}`
export const CLOUD_UPDATE_DEVICE_CONFIG_TOPIC = `cloud.deviceConfig.update.${KAFKA_VERSION}`
export enum videoEventsQualities {
  LOW = 'low',
}

export const MONGO_ORDER_BY_ASC = 1
export const MONGO_ORDER_BY_DESC = -1
export const RETRY_DELAY_FIRST_HOUR_SECONDS = 115
export const RETRY_DELAY_AFTER_FIRST_HOUR_SECONDS = 295
export const FRONT_CAMERA_ID = 1
export const IN_CABIN_CAMERA_ID = 2
