const getMode = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env?.MODE) {
      return import.meta.env.MODE;
    }
  } catch (error) {
    // ignore
  }
  return typeof process !== 'undefined' && process.env && process.env.NODE_ENV
    ? process.env.NODE_ENV
    : 'development';
};

const isDev = () => getMode() !== 'production';

const callConsole = (method, args) => {
  if (!isDev()) return;
  if (!(method in console)) return;
  // eslint-disable-next-line no-console
  console[method](...args);
};

const devConsole = {
  log: (...args) => callConsole('log', args),
  warn: (...args) => callConsole('warn', args),
  error: (...args) => callConsole('error', args),
  info: (...args) => callConsole('info', args),
  assert: (condition, ...args) => {
    if (!isDev()) return;
    // eslint-disable-next-line no-console
    console.assert(condition, ...args);
  },
};

export default devConsole;
