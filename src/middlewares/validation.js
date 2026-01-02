const Joi = require('joi');
const { AppError } = require('./errorHandler');

/**
 * Activity types consentiti
 */
const ACTIVITY_TYPES = [
  'lavoro',
  'meeting',
  'formazione',
  'supporto',
  'ferie',
  'festività',
  'malattia',
  'permesso',
  'trasferta',
  'pausa',
  'altro'
];

/**
 * Schema validazione login
 */
const loginSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Username deve contenere solo caratteri alfanumerici',
      'string.min': 'Username deve essere lungo almeno 3 caratteri',
      'any.required': 'Username è obbligatorio'
    }),
  password: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'Password è obbligatoria'
    })
});

/**
 * Schema validazione attività
 */
const activitySchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Formato data non valido. Usare YYYY-MM-DD',
      'any.required': 'Data è obbligatoria'
    }),
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):(00|15|30|45)$/)
    .required()
    .messages({
      'string.pattern.base': 'Orario di inizio non valido. Usare HH:MM con step di 15 minuti',
      'any.required': 'Orario di inizio è obbligatorio'
    }),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):(00|15|30|45)$/)
    .required()
    .messages({
      'string.pattern.base': 'Orario di fine non valido. Usare HH:MM con step di 15 minuti',
      'any.required': 'Orario di fine è obbligatorio'
    }),
  activityType: Joi.string()
    .valid(...ACTIVITY_TYPES)
    .required()
    .messages({
      'any.only': `Tipo attività non valido. Valori ammessi: ${ACTIVITY_TYPES.join(', ')}`,
      'any.required': 'Tipo attività è obbligatorio'
    }),
  customType: Joi.string()
    .max(100)
    .allow(null, '')
    .messages({
      'string.max': 'Tipo personalizzato troppo lungo (max 100 caratteri)'
    }),
  notes: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Note troppo lunghe (max 500 caratteri)'
    })
});

/**
 * Schema validazione update attività (campi opzionali)
 */
const activityUpdateSchema = Joi.object({
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):(00|15|30|45)$/)
    .messages({
      'string.pattern.base': 'Orario di inizio non valido'
    }),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):(00|15|30|45)$/)
    .messages({
      'string.pattern.base': 'Orario di fine non valido'
    }),
  activityType: Joi.string()
    .valid(...ACTIVITY_TYPES)
    .messages({
      'any.only': `Tipo attività non valido`
    }),
  customType: Joi.string()
    .max(100)
    .allow(null, ''),
  notes: Joi.string()
    .max(500)
    .allow('')
}).min(1); // Almeno un campo deve essere presente

/**
 * Middleware factory per validazione con Joi
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return next(new AppError(
        'Errori di validazione',
        400,
        'VALIDATION_ERROR',
        details
      ));
    }

    // Sostituisce body con valore validato e sanitizzato
    req.body = value;
    next();
  };
}

module.exports = {
  ACTIVITY_TYPES,
  loginSchema,
  activitySchema,
  activityUpdateSchema,
  validate
};
