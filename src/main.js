// Stellarium Web - Copyright (c) 2018 - Noctua Software Ltd
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'

import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.css'

import Router from 'vue-router'

import store from './store'

import * as VueGoogleMaps from 'vue2-google-maps'

import VueObserveVisibility from 'vue-observe-visibility'
import fullscreen from 'vue-fullscreen'
import VueJsonp from 'vue-jsonp'

import VueCookie from 'vue-cookie'

import App from './App'
import Signin from './components/signin.vue'
import MyProfile from './components/my-profile.vue'

import { i18n } from './plugins/i18n.js'

Vue.use(VueCookie)

// Used to work-around a gmaps component refresh bug
Vue.use(VueObserveVisibility)

Vue.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyBOfY-p-V3zecsV_K3pPuYyTPm5Vy-FURo',
    libraries: 'places' // Required to use the Autocomplete plugin
  }
})
Vue.use(Vuetify)

Vue.use(fullscreen)

Vue.use(VueJsonp)
// Vue.config.productionTip = false

var plugins = []
plugins.push(require('./plugins/calendar').default)
plugins.push(require('./plugins/news').default)
// plugins.push(require('./plugins/observing').default)

Vue.SWPlugins = plugins

Vue.use(Router)

// Add routes from plugins
let routes = [
  {
    path: '/',
    name: 'App',
    component: App,
    children: [
      {
        path: 'observing/signin',
        component: Signin
      },
      {
        path: 'observing/profile',
        component: MyProfile
      }
    ]
  },
  {
    path: '/skysource/:name',
    component: App,
    alias: '/'
  }
]

let defaultObservingRoute = {
  path: 'observing/signin',
  meta: {prio: 99}
}
for (let i in Vue.SWPlugins) {
  let plugin = Vue.SWPlugins[i]
  console.log('Loading plugin: ' + plugin.name)
  if (plugin.routes) {
    routes = routes.concat(plugin.routes)
  }
  if (plugin.observingRoutes) {
    routes[0].children = routes[0].children.concat(plugin.observingRoutes)
    for (let j in plugin.observingRoutes) {
      let r = plugin.observingRoutes[j]
      if (r.meta && r.meta.prio && r.meta.prio < defaultObservingRoute.meta.prio) {
        defaultObservingRoute = r
      }
    }
  }
  if (plugin.vuePlugin) {
    Vue.use(plugin.vuePlugin)
  }
}
routes[0].children.push({ path: '/observing', redirect: defaultObservingRoute.path })

var router = new Router({
  mode: 'history',
  routes: routes
})

Vue.prototype.$stellariumWebPlugins = function () {
  return Vue.SWPlugins
}

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  i18n,
  store,
  template: '<router-view></router-view>'
})
