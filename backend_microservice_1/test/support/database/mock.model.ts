export abstract class MockModel<T> {
  protected abstract entityStub: T

  constructor(createEntityData: T) {
    this.constructorSpy(createEntityData)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructorSpy(_createEntityData: T): void {
    this.entityStub = _createEntityData
  }

  findOne(criteria): { exec: () => T } {
    return {
      exec: (): T => {
        return this.isExist(criteria) ? this.entityStub : null
      },
    }
  }

  find(): { exec: () => T[] } {
    return {
      exec: (): T[] => [this.entityStub],
    }
  }

  aggregate(): { exec: () => any[] } {
    return {
      exec: (): any[] => [this.entityStub],
    }
  }

  updateOne(criteria): any {
    return {
      exec: (): { n: number } => {
        return this.isExist(criteria) ? { n: 1 } : { n: 0 }
      },
    }
  }

  updateMany(criteria): any {
    return {
      exec: (): { n: number } => {
        return this.isExist(criteria) ? { n: 5 } : { n: 0 }
      },
    }
  }

  async save(): Promise<T> {
    return this.entityStub
  }

  findOneAndUpdate(criteria, update): { exec: () => Promise<T> } {
    let updated
    if (update.$inc) {
      updated = update.$inc
    }
    return {
      exec: async () => {
        return this.isExist(criteria)
          ? { ...this.entityStub, ...updated }
          : undefined
      },
    }
  }

  async bulkWrite(): Promise<any> {
    return true
  }

  isExist(criteria) {
    for (const criterion in criteria) {
      if (this.entityStub[criterion] != criteria[criterion]) {
        return false
      }
    }
    return true
  }

  create() {
    return this.entityStub
  }

  async insertMany(): Promise<T[]> {
    return [this.entityStub]
  }

  findOneAndDelete(criteria): { exec: () => T } {
    return {
      exec: (): T => {
        return this.isExist(criteria) ? this.entityStub : null
      },
    }
  }

  findOneAndRemove(criteria): { exec: () => T } {
    return {
      exec: (): T => {
        return this.isExist(criteria) ? this.entityStub : null
      },
    }
  }

  deleteMany(criteriaList): { exec: () => { deletedCount: number } } {
    return {
      exec: (): { deletedCount: number } => {
        let deletedCount = 0
        for (const criteria in criteriaList) {
          deletedCount += this.isExist(criteria) ? 1 : 0
        }
        return { deletedCount }
      },
    }
  }

  countDocuments(criteria): any {
    return {
      exec: (): number => {
        return this.isExist(criteria) ? 1 : 0
      },
    }
  }
}
