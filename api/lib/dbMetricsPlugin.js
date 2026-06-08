const { dbOperationDuration } = require('./metrics');

/**
 * Global Mongoose Plugin: Database Operation Instrumentation
 *
 * Registers pre/post hooks on every schema so that the duration of each
 * database operation is observed into the `app_db_operation_duration_seconds`
 * histogram, labeled by { model, operation }.
 *
 * DEVOPS NOTE: model + operation are low-cardinality labels (a fixed, small set),
 * so this is safe for Prometheus. We never label by document id or query content.
 *
 * Must be registered via `mongoose.plugin(...)` BEFORE any model is compiled.
 */

// Query-level middleware (operates on a Mongoose Query / Aggregate)
const QUERY_OPERATIONS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'estimatedDocumentCount',
  'aggregate'
];

function resolveModelName(ctx) {
  // Query middleware exposes `this.model`, Aggregate exposes `this._model`.
  if (ctx.model && ctx.model.modelName) return ctx.model.modelName;
  if (typeof ctx.model === 'function') {
    try { return ctx.model().modelName; } catch (e) { /* noop */ }
  }
  if (ctx.constructor && ctx.constructor.modelName) return ctx.constructor.modelName;
  return 'unknown';
}

module.exports = function dbMetricsPlugin(schema) {
  QUERY_OPERATIONS.forEach((operation) => {
    schema.pre(operation, function startTimer() {
      this._dbMetricsEnd = dbOperationDuration.startTimer({
        model: resolveModelName(this),
        operation
      });
    });

    schema.post(operation, function stopTimer() {
      if (this._dbMetricsEnd) this._dbMetricsEnd();
    });
  });

  // Document-level middleware for `.save()` (covers create + update of documents)
  schema.pre('save', function startSaveTimer() {
    this._dbMetricsEnd = dbOperationDuration.startTimer({
      model: this.constructor.modelName || 'unknown',
      operation: 'save'
    });
  });

  schema.post('save', function stopSaveTimer() {
    if (this._dbMetricsEnd) this._dbMetricsEnd();
  });
};
