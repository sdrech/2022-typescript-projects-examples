import { MockModel } from './database/mock.model'
import {
  CompletedProcess,
  CompletedProcessDocument,
} from '../../src/retryable-process/entities/retryable-process.entity'
import { retryableProcessStub } from '../stubs/retryable-process.stub'

export class CompletedProcessModelMock extends MockModel<CompletedProcess> {
  protected entityStub = retryableProcessStub() as CompletedProcessDocument

  populate(): this {
    return this
  }
}
