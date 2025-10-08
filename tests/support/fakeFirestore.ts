class FakeDocumentSnapshot {
  constructor(private readonly _id: string, private readonly _data?: Record<string, unknown>) {}

  get id() {
    return this._id;
  }

  get exists() {
    return this._data !== undefined;
  }

  data() {
    return this._data ? clone(this._data) : undefined;
  }
}

class FakeDocumentReference {
  constructor(
    private readonly store: FakeFirestore,
    private readonly collectionName: string,
    private readonly docId: string,
  ) {}

  async get() {
    const data = this.store._getCollection(this.collectionName).get(this.docId);
    return new FakeDocumentSnapshot(this.docId, data ? clone(data) : undefined);
  }

  set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    const collection = this.store._getCollection(this.collectionName);
    const existing = collection.get(this.docId);
    if (options?.merge && existing) {
      collection.set(this.docId, { ...existing, ...clone(data) });
    } else {
      collection.set(this.docId, clone(data));
    }
  }

  update(data: Record<string, unknown>) {
    const collection = this.store._getCollection(this.collectionName);
    const existing = collection.get(this.docId);
    if (!existing) {
      throw new Error('not-found');
    }
    collection.set(this.docId, { ...existing, ...clone(data) });
  }
}

class FakeCollectionReference {
  constructor(private readonly store: FakeFirestore, private readonly name: string) {}

  doc(id: string) {
    if (!id) {
      throw new Error('doc id required');
    }
    return new FakeDocumentReference(this.store, this.name, id);
  }
}

class FakeTransaction {
  constructor(private readonly store: FakeFirestore) {}

  async get(ref: FakeDocumentReference) {
    return ref.get();
  }

  set(ref: FakeDocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }) {
    ref.set(data, options);
  }

  update(ref: FakeDocumentReference, data: Record<string, unknown>) {
    ref.update(data);
  }
}

export class FakeFirestore {
  private readonly collections = new Map<string, Map<string, Record<string, unknown>>>();

  _getCollection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  collection(name: string) {
    return new FakeCollectionReference(this, name);
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T> | T) {
    const tx = new FakeTransaction(this);
    return fn(tx);
  }

  getDoc(collection: string, id: string) {
    const data = this._getCollection(collection).get(id);
    return data ? clone(data) : undefined;
  }
}

function clone<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = clone(val);
    }
    return result as T;
  }
  return value;
}

