const subscribers = {}
let currentSubscriberId = 0

function unsubscribe(id) {
  delete subscribers[id]
}

export function subscribe(fn) {
  const subscriptionId = currentSubscriberId++
  subscribers[subscriptionId] = fn
  return unsubscribe.bind(null, subscriptionId)
}

export function emitError(...args) {
  const subscribersIds = Object.keys(subscribers)
  subscribersIds.forEach(id => subscribers[id](...args))
}
