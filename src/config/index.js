'use strict';

// Central place that reads environment variables, so the rest of the code
// never touches process.env directly.

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'];

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const port = Number.parseInt(env.PORT, 10);
  const logLevel = (env.LOG_LEVEL || 'info').toLowerCase();

  return {
    env: nodeEnv,
    port: Number.isInteger(port) && port >= 0 && port <= 65535 ? port : 3000,
    logLevel: LOG_LEVELS.includes(logLevel) ? logLevel : 'info',
    // The simulation header is a demo/testing aid, so it is off in production by default.
    enableFailureSimulation: parseBoolean(
      env.ENABLE_FAILURE_SIMULATION,
      nodeEnv !== 'production'
    ),
  };
}

module.exports = { loadConfig, LOG_LEVELS };
