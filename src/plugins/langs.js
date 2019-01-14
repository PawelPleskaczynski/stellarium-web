var exports = module.exports = {}

var language = window.navigator.userLanguage || window.navigator.language
if (language.includes('-')) language = language.substring(0, language.indexOf('-'))
const listLanguages = ['en', 'pl']
if (!listLanguages.includes(language)) language = 'en'

exports.language = function () {
  return language
}

exports.updateLanguage = function (lang) {
  language = lang
}
