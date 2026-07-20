// server/app/middleware/validate.middleware.js
//
// B.13 Validation Layer / B.14 Middleware Foundation.
// A single generic middleware factory used by every route to validate
// body/query/params against a Joi schema, instead of each controller
// hand-rolling its own field checks.

const AppError = require('../utils/AppError');

/**
 * @param {import('joi').Schema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      return next(AppError.badRequest('Request validation failed.', details));
    }

    req[source] = value;
    return next();
  };
}

module.exports = validate;
