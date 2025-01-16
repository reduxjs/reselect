/** Imported from Immer to avoid having an implicit dependency in this patch */
type PrimitiveType = number | string | boolean
type AtomicObject = Function | Promise<any> | Date | RegExp
export type IfAvailable<T, Fallback = void> =
  // fallback if any
  true | false extends (T extends never ? true : false)
    ? Fallback // fallback if empty type
    : keyof T extends never
    ? Fallback // original type
    : T
type WeakReferences = IfAvailable<WeakMap<any, any>> | IfAvailable<WeakSet<any>>
export type WritableDraft<T> = { -readonly [K in keyof T]: Draft<T[K]> }
export type Draft<T> = T extends PrimitiveType
  ? T
  : T extends AtomicObject
  ? T
  : T extends IfAvailable<ReadonlyMap<infer K, infer V>> // Map extends ReadonlyMap
  ? Map<Draft<K>, Draft<V>>
  : T extends IfAvailable<ReadonlySet<infer V>> // Set extends ReadonlySet
  ? Set<Draft<V>>
  : T extends WeakReferences
  ? T
  : T extends object
  ? WritableDraft<T>
  : T
export type Immutable<T> = T extends PrimitiveType
  ? T
  : T extends AtomicObject
  ? T
  : T extends IfAvailable<ReadonlyMap<infer K, infer V>> // Map extends ReadonlyMap
  ? ReadonlyMap<Immutable<K>, Immutable<V>>
  : T extends IfAvailable<ReadonlySet<infer V>> // Set extends ReadonlySet
  ? ReadonlySet<Immutable<V>>
  : T extends WeakReferences
  ? T
  : T extends object
  ? { readonly [K in keyof T]: Immutable<T[K]> }
  : T
