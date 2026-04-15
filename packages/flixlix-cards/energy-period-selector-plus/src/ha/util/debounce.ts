export const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number,
  immediate = false
) => {
  let timeout: number | undefined;
  let trailingArgs: T | undefined;

  const debouncedFunc = (...args: T): void => {
    const isLeading = immediate && !timeout;

    if (timeout) {
      trailingArgs = args;
    }
    clearTimeout(timeout);

    timeout = window.setTimeout(() => {
      timeout = undefined;
      if (trailingArgs) {
        func(...trailingArgs);
        trailingArgs = undefined;
      } else if (!immediate) {
        func(...args);
      }
    }, wait);

    if (isLeading) {
      func(...args);
    }
  };

  debouncedFunc.cancel = () => {
    clearTimeout(timeout);
    trailingArgs = undefined;
  };

  return debouncedFunc;
};
