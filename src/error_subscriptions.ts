import { SelectorArray } from "./types";

type SubcribersFunction = (...args: [Error?, Function?, IArguments?, SelectorArray?, any?]) => void

interface Subscribers {
  [index: string | number]: SubcribersFunction;
}

const subscribers: Subscribers = {}
let currentSubscriberId = 0

function unsubscribe(id: string | number) {
  delete subscribers[id]
}

export function subscribe(fn: SubcribersFunction) {
  const subscriptionId = currentSubscriberId++
  subscribers[subscriptionId] = fn
  return unsubscribe.bind(null, subscriptionId);
}

export function emitError(...args: [Error?, Function?, IArguments?, SelectorArray?, any?]) {
  const subscribersIds = (Object.keys(subscribers) as Array<keyof typeof subscribers>)
  subscribersIds.forEach(id => subscribers[id](...args));
}