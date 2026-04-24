const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const tr = require('../locales/tr.json');
const en = require('../locales/en.json');

i18next.use(middleware.LanguageDetector).init({
  fallbackLng: 'tr',
  supportedLngs: ['tr', 'en'],
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  detection: {
    order: ['header'],
    lookupHeader: 'accept-language',
  },
});

module.exports = { i18next, middleware };
