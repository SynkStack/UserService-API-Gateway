'use strict';

// Every successful response has the same envelope:
// { "success": true, "data": ..., "requestId": "..." }
function sendSuccess(req, res, data, status = 200) {
  res.status(status).json({ success: true, data, requestId: req.id });
}

module.exports = { sendSuccess };
