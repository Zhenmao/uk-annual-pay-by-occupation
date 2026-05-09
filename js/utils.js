// https://garden.bradwoods.io/notes/javascript/performance/debounce-throttle
export function debounce(callback, waitMS = 200) {
  let timeoutId;

  return function (...args) {
    const context = this;
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      callback.call(context, ...args);
    }, waitMS);
  };
}
