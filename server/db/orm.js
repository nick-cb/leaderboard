const EventEmitter = require("node:events");
class MyEmitter extends EventEmitter {}

function select(fields) {
  let resolveFn;
  let rejectFn;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  // const event = new MyEmitter();
  let promiseResult;
  function updateQuery(operation) {
    if (operation === "from") {
      console.log("from");
      promiseResult = "from";
      return;
    }
    if (operation === "when") {
      console.log("when:", promiseResult);
      promiseResult += "when";
      return;
    }
  }
  async function asyncTest() {
    console.log("async test");
    return await new Promise((resolve) => {
      console.log("new promise");
      setTimeout(() => {
        console.log("resolve new promise");
        resolve(true);
      }, 3000);
    });
  }

  return {
    from() {
      updateQuery("from");
      promise.when = async function () {
        await asyncTest();
        updateQuery("when");
        return promise;
      };

      process.nextTick(() => {
        console.log("resolve promise", promiseResult);
        resolveFn(promiseResult);
      });
      return promise;
    },
  };
}

(async () => {
  const result = await select({ a: "a" }).from().when();
  console.log({ result });
  // result.then((data) => {
  //   console.log({ data });
  // });
})();

/*
Stack:
-> select
<-
-> from
  -> nextTick: Schedule callback to be run after the current operation
  <-
<-
-> when
  -> asyncTest
    -> new Promise
      -> setTimeout: Push callback to the timers queue
      <-
    <-
  : asyncTest being process in the background
<-
: end of current operation
-> nextTick callback
<-
-> process setTimeout callback
<-
-> asyncTest is resolved
<-
-> updateQuery
*/
