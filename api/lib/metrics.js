const client = require('prom-client');

/**
 * Custom Prometheus Metrics Configurator
 * Registers custom metrics to the default registry of prom-client.
 * 
 * IMPORTANT DEVOPS RULE: Avoid high cardinality labels!
 * Do NOT use unique values like user IDs, emails, IP addresses, or request UUIDs as label values.
 * Every unique label combination creates a new time series in Prometheus database, leading to memory bloat.
 */

// 1. User Logins Counter
const loginAttemptsCounter = new client.Counter({
  name: 'app_user_login_attempts_total',
  help: 'Total number of login attempts, labeled by status (success/failure)',
  labelNames: ['status'] // e.g. status: 'success' or 'failure'
});

// 2. User Registrations Counter
const registrationsCounter = new client.Counter({
  name: 'app_user_registrations_total',
  help: 'Total number of registered users, labeled by role',
  labelNames: ['role']
});

// 3. Database Operation Duration Histogram
const dbOperationDuration = new client.Histogram({
  name: 'app_db_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['model', 'operation'], // e.g. model: 'Users', operation: 'findOne' | 'save'
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0] // custom buckets for query response times
});

// 4. Global Error Counter
const errorCounter = new client.Counter({
  name: 'app_errors_total',
  help: 'Total number of occurred application errors',
  labelNames: ['error_name', 'status_code'] // e.g. error_name: 'NotFoundError', status_code: '404'
});

module.exports = {
  client,
  loginAttemptsCounter,
  registrationsCounter,
  dbOperationDuration,
  errorCounter
};
