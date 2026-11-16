'use strict';

const { AppError } = require('../errors');
const { FAILURE_MODES } = require('../services/upstreamClient');

// Demo/testing aid: lets you force an upstream failure for one request, e.g.
//   curl.exe -H "X-Simulate-Upstream-Failure: timeout" http://localhost:3000/api/users
// The header is ignored completely when ENABLE_FAILURE_SIMULATION is false.
function simulateUpstreamFailure(config) {
  return function readSimulationHeader(req, _res, next) {
    if (!config.enableFailureSimulation) return next();

    const value = req.get('X-Simulate-Upstream-Failure');
    if (value === undefined) return next();

    if (!FAILURE_MODES.includes(value)) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid X-Simulate-Upstream-Failure header', [
          { field: 'X-Simulate-Upstream-Failure', message: `Must be one of: ${FAILURE_MODES.join(', ')}` },
        ])
      );
    }

    req.simulate = value;
    return next();
  };
}

module.exports = { simulateUpstreamFailure };
