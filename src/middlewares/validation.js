const Joi = require('joi');
const { AppError } = require('./errorHandler');
const activityTypesService = require('../services/admin/activityTypesService');

let ACTIVITY_TYPES = [
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

async function loadActivityTypes() {
  try {
    ACTIVITY_TYPES = await activityTypesService.getActivityTypes();
  } catch (error) {
    console.error('Error loading activity types, using defaults:', error);
  }
}

loadActivityTypes();

const loginSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.pattern.base': 'Username può contenere solo lettere, numeri, punti, trattini e underscore',
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
}).min(1);

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

    req.body = value;
    next();
  };
}

async function getActivityTypes() {
  return ACTIVITY_TYPES;
}

async function reloadActivityTypes() {
  await loadActivityTypes();
  return ACTIVITY_TYPES;
}

module.exports = {
  ACTIVITY_TYPES,
  getActivityTypes,
  reloadActivityTypes,
  loginSchema,
  activitySchema,
  activityUpdateSchema,
  validate
};
