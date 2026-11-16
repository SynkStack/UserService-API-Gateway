'use strict';

// Tiny structured logger: one JSON object per line.
// `write` can be replaced, which lets tests capture log lines.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function createLogger({ level = 'info', write = (line) => process.stdout.write(`${line}\n`) } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function log(levelName, message, fields = {}) {
    if (LEVELS[levelName] < threshold) return;
    write(
      JSON.stringify({
        time: new Date().toISOString(),
        level: levelName,
        message,
        ...fields,
      })
    );
  }

  return {
    debug: (message, fields) => log('debug', message, fields),
    info: (message, fields) => log('info', message, fields),
    warn: (message, fields) => log('warn', message, fields),
    error: (message, fields) => log('error', message, fields),
  };
}

module.exports = { createLogger };
