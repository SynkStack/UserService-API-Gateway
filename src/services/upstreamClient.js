'use strict';

const { UpstreamCallError } = require('../errors');

// The upstream client is the only place where the gateway "talks" to upstream
// services. Routes never call a mock directly.
//
// Failures can be forced for demos and tests in two ways:
//   1. setState('users', 'unavailable')  -> every call to that service fails
//   2. the `simulate` option (set from the X-Simulate-Upstream-Failure header)
//      -> only that one call fails
const FAILURE_MODES = ['unavailable', 'timeout', 'error'];

function createUpstreamClient(services) {
  const states = {};

  return {
    serviceNames: Object.keys(services),

    setState(serviceName, mode) {
      if (!services[serviceName]) throw new Error(`Unknown upstream service: ${serviceName}`);
      if (mode === 'up') delete states[serviceName];
      else if (FAILURE_MODES.includes(mode)) states[serviceName] = mode;
      else throw new Error(`Unknown failure mode: ${mode}`);
    },

    resetStates() {
      Object.keys(states).forEach((key) => delete states[key]);
    },

    async call(serviceName, method, args = [], { simulate } = {}) {
      const service = services[serviceName];
      if (!service) throw new Error(`Unknown upstream service: ${serviceName}`);

      const failureMode = simulate || states[serviceName];
      try {
        if (failureMode) throw service.createFailure(failureMode);
        return await service[method](...args);
      } catch (err) {
        // Keep the raw failure, but tag it with the service name.
        throw new UpstreamCallError(serviceName, err);
      }
    },
  };
}

module.exports = { createUpstreamClient, FAILURE_MODES };
