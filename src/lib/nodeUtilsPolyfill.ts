/**
 * Browser-safe polyfill for nodeUtils / util
 */
export const deprecate = (fn: Function) => fn;
export default {
  deprecate,
};
