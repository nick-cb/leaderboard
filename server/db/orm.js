const EventEmitter = require('node:events');
class MyEmitter extends EventEmitter {}

function select(fields) {
  let resolveFn;
  let rejectFn;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  const event = new MyEmitter();
  let promiseResult;
  event.on('from', () => {
    console.log("from");
    promiseResult = 'from';
  });
  event.on('when', () => {
    console.log("when", promiseResult);
    promiseResult += 'when';
  });

  return {
    from() {
      event.emit('from');
      promise.when = function() {
        event.emit('when');
        return promise;
      }
      process.nextTick(() => {console.log('resolve promise', promiseResult);resolveFn(promiseResult)})
      return promise;
    }
  }
}

(async() => {
  const result = await select({a:'a'}).from().when();
  console.log(result);
})()
