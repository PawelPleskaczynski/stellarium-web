import Vue from 'vue'
import VueI18n from 'vue-i18n'

var language = window.navigator.userLanguage || window.navigator.language
if (language.includes('-')) language = language.substring(0, language.indexOf('-'))
const listLanguages = ['en', 'pl']
if (!listLanguages.includes(language)) language = 'en'

const messages = {
  en: {
    planets: {
      sun: 'sun',
      moon: 'moon',
      mercury: 'mercury',
      venus: 'venus',
      earth: 'earth',
      mars: 'mars',
      jupiter: 'jupiter',
      saturn: 'saturn',
      uranus: 'uranus',
      neptune: 'neptune',
      pluto: 'pluto',
      planet: 'planet'
    },
    general: {
      constellation: 'constellation'
    }
  },
  pl: {
    planets: {
      sun: 'sun',
      moon: 'księżyc',
      mercury: 'merkury',
      venus: 'wenus',
      earth: 'ziemia',
      mars: 'mars',
      jupiter: 'jowisz',
      saturn: 'saturn',
      uranus: 'uran',
      neptune: 'neptun',
      pluto: 'pluton',
      planet: 'planeta'
    },
    general: {
      constellation: 'konstelacja'
    }
  }
}

Vue.use(VueI18n)
export const i18n = new VueI18n({
  locale: language,
  fallbackLocale: 'en',
  messages
})
