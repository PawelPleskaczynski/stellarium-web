// Stellarium Web - Copyright (c) 2018 - Noctua Software Ltd
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>

<v-app dark>
  <v-snackbar bottom left multi-line :timeout="0" v-model="snackbar" color="secondary" >
    <p>{{ $t('ui.app.cookies') }}<a v-on:click.stop="$store.state.showPrivacyDialog = true">{{ $t('ui.app.privacy_policy') }}</a>.</p>
    <v-btn class="blue--text darken-1" flat @click.native="acceptCookies">{{ $t('ui.app.agree') }}</v-btn>
  </v-snackbar>
  <v-navigation-drawer absolute temporary clipped v-model="nav" dark>
    <v-list dense>
      <template v-for="(item,i) in menuItems">
        <v-subheader v-if="item.header" v-text="item.header" class="grey--text text--darken-1"/>
        <v-divider class="divider_menu" v-else-if="item.divider" />
        <v-list-tile avatar v-else-if="item.switch" @click.stop="toggleStoreValue(item.store_var_name)">
          <v-list-tile-action>
            <v-switch value :input-value="getStoreValue(item.store_var_name)" label=""></v-switch>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{ item.title }}</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <template v-else>
          <v-list-tile v-if='item.link' target="_blank" :href='item.link' >
            <v-list-tile-avatar><v-icon>{{ item.icon }}</v-icon></v-list-tile-avatar>
            <v-list-tile-title v-text="item.title"/>
            <v-icon disabled>open_in_new</v-icon>
          </v-list-tile>
          <v-list-tile v-else @click.stop="toggleStoreValue(item.store_var_name)">
            <v-list-tile-avatar><v-icon>{{ item.icon }}</v-icon></v-list-tile-avatar>
            <v-list-tile-title v-text="item.title"/>
          </v-list-tile>
        </template>
      </template>
    </v-list>
  </v-navigation-drawer>

  <div id="stel" v-bind:class="{ right_panel: $store.state.showSidePanel }">
    <div style="position: relative; width: 100%; height: 100%">
      <component v-bind:is="guiComponent"></component>
      <canvas id="stel-canvas" ref='stelCanvas'></canvas>
    </div>
  </div>

</v-app>

</template>

<script>

import _ from 'lodash'
import Gui from '@/components/gui.vue'
import GuiLoader from '@/components/gui-loader.vue'
import swh from '@/assets/sw_helpers.js'
import Moment from 'moment'
import NoctuaSkyClient from '@/assets/noctuasky-client'
import { i18n } from './plugins/i18n.js'

export default {
  data (context) {
    return {
      snackbar: this.$cookie.get('cookieAccepted') !== 'y',
      guiComponent: 'GuiLoader',
      startTimeIsSet: false
    }
  },
  components: { Gui, GuiLoader },
  methods: {
    getPluginsMenuItems: function () {
      let res = []
      for (let i in this.$stellariumWebPlugins()) {
        let plugin = this.$stellariumWebPlugins()[i]
        if (plugin.menuItems) {
          res = res.concat(plugin.menuItems)
        }
      }
      if (res.length > 0) {
        res = [{divider: true}].concat(res)
      }
      return res
    },
    toggleStoreValue: function (storeVarName) {
      this.nav = false
      this.$store.commit('toggleBool', storeVarName)
    },
    getStoreValue: function (storeVarName) {
      return _.get(this.$store.state, storeVarName)
    },
    acceptCookies: function () {
      this.$cookie.set('cookieAccepted', 'y', { expires: '2Y' })
      this.snackbar = false
    },
    setTimeAfterSunSet: function () {
      // Look for the next time starting from now on when the night Sky is visible
      // i.e. when sun is more than 10 degree below horizon.
      // If no such time was found (e.g. in a northern country in summer),
      // we default to current time.
      let sun = this.$stel.getObj('Sun')
      let obs = this.$stel.observer.clone()
      let utc = obs.utc
      let i = 0
      for (i = 0; i < 24 * 60 / 5 + 1; i++) {
        obs.utc = utc + 1.0 / (24 * 60) * (i * 5)
        sun.update(obs)
        let azalt = this.$stel.convertPosition(obs, 'ICRS', 'OBSERVED', sun.icrs)
        let alt = this.$stel.anpm(this.$stel.c2s(azalt)[1])
        if (alt < -10 * Math.PI / 180) {
          break
        }
      }
      this.$stel.observer.utc = obs.utc
      this.startTimeIsSet = true
    },
    setStateFromQueryArgs: function () {
      // Check whether the observing panel must be displayed
      this.$store.commit('setValue', {varName: 'showSidePanel', newValue: this.$route.path.startsWith('/observing')})

      // Set the core's state from URL query arguments such
      // as date, location, view direction & fov
      var that = this
      let d = new Date()
      if (this.$route.query.date) {
        d = new Moment(this.$route.query.date).toDate()
        this.$stel.core.observer.utc = d.getMJD()
        this.startTimeIsSet = true
      }

      if (this.$route.query.lng && this.$route.query.lat) {
        let pos = {lat: Number(this.$route.query.lat), lng: Number(this.$route.query.lng), alt: this.$route.query.elev ? Number(this.$route.query.elev) : 0, accuracy: 1}
        swh.geoCodePosition(pos).then((loc) => {
          that.$store.commit('setCurrentLocation', loc)
        }, (error) => { console.log(error) })
      }

      this.$stel.core.observer.azimuth = this.$route.query.az ? Number(this.$route.query.az) * Math.PI / 180 : 0
      this.$stel.core.observer.altitude = this.$route.query.alt ? Number(this.$route.query.alt) * Math.PI / 180 : 30 * Math.PI / 180
      this.$stel.core.fov = this.$route.query.fov ? Number(this.$route.query.fov) * Math.PI / 180 : 120 * Math.PI / 180

      if (this.$route.path.startsWith('/skysource/')) {
        let name = decodeURIComponent(this.$route.path.substring(11))
        console.log('Will select object: ' + name)
        return NoctuaSkyClient.skysources.getByName(name).then(ss => {
          if (!ss) {
            return
          }
          let obj = swh.skySource2SweObj(ss)
          if (!obj) {
            obj = this.$stel.createObj(ss.model, ss)
            this.$selectionLayer.add(obj)
          }
          if (!obj) {
            console.warning("Can't find object in SWE: " + ss.short_name)
          }
          swh.setSweObjAsSelection(obj)
        }, err => {
          console.log(err)
          console.log("Couldn't find skysource for name: " + name)
        })
      }
    }
  },
  computed: {
    menuItems: function () {
      return [
        {header: i18n.t('ui.app.ephemeris')},
        {title: i18n.t('ui.app.planets_tonight'), icon: 'panorama_fish_eye', store_var_name: 'showPlanetsVisibilityDialog'},
        {divider: true},
        {header: i18n.t('ui.app.settings')},
        {title: i18n.t('ui.app.view_settings'), icon: 'settings', store_var_name: 'showViewSettingsDialog'},
        {title: i18n.t('ui.app.lang_settings'), icon: 'translate', store_var_name: 'showLangSettingsDialog'}
      ].concat(this.getPluginsMenuItems()).concat([
        {divider: true},
        {title: i18n.t('ui.app.about'), icon: 'info', store_var_name: 'showAboutDialog'},
        {title: i18n.t('ui.app.data_credits'), icon: 'copyright', store_var_name: 'showDataCreditsDialog'},
        {title: i18n.t('ui.app.privacy'), icon: 'lock', store_var_name: 'showPrivacyDialog'}
      ])
    },
    nav: {
      get: function () {
        return this.$store.state.showNavigationDrawer
      },
      set: function (v) {
        if (this.$store.state.showNavigationDrawer !== v) {
          this.$store.commit('toggleBool', 'showNavigationDrawer')
        }
      }
    },
    storeCurrentLocation: function () {
      return this.$store.state.currentLocation
    }
  },
  watch: {
    storeCurrentLocation: function (loc) {
      const DD2R = Math.PI / 180
      this.$stel.core.observer.latitude = loc.lat * DD2R
      this.$stel.core.observer.longitude = loc.lng * DD2R
      this.$stel.core.observer.elevation = loc.alt

      // At startup, we need to wait for the location to be set before deciding which
      // startup time to set so that it's night time.
      if (!this.startTimeIsSet) {
        this.setTimeAfterSunSet()
      }
      // Init of time and date is complete
      this.$store.commit('setValue', {varName: 'initComplete', newValue: true})
    },
    '$route': function () {
      // react to route changes...
      this.setStateFromQueryArgs()
    }
  },
  mounted: function () {
    var that = this

    // Init NoctuaSkyClient
    let onNoctuaSkyStateChanged = function (path, value) {
      if (path === '') {
        that.$store.commit('replaceNoctuaSkyState', value)
        return
      }
      let tree = that.$store.state.noctuaSky
      _.set(tree, path, value)
      that.$store.commit('replaceNoctuaSkyState', tree)
    }
    NoctuaSkyClient.init(process.env.NOCTUASKY_API_SERVER, onNoctuaSkyStateChanged)

    import('@/assets/js/stellarium-web-engine.wasm').then(f => {
      // Initialize the StelWebEngine viewer singleton
      // After this call, the StelWebEngine state will always be available in vuex store
      // in the $store.stel object in a reactive way (useful for vue components).
      // To modify the state of the StelWebEngine, it's enough to call/set values directly on the $stel object
      try {
        swh.initStelWebEngine(that.$store, f, that.$refs.stelCanvas, function () {
          // Start auto location detection (even if we don't use it)
          swh.getGeolocation(this).then(swh.geoCodePosition).then((loc) => {
            that.$store.commit('setAutoDetectedLocation', loc)
          }, (error) => { console.log(error) })
          that.setStateFromQueryArgs()
          that.guiComponent = 'Gui'
        })
      } catch (e) {
        this.$store.commit('setValue', {varName: 'wasmSupport', newValue: false})
      }
    })
  }
}
</script>

<style>

a {
  color: #82b1ff;
}

a:link {
  text-decoration-line: none;
}

.divider_menu {
  margin-top: 20px;
  margin-bottom: 20px;
}

html, body {
  overflow-y: auto;
  position: fixed!important;
  width: 100%;
  height: 100%;
  padding: 0!important;
}

.fullscreen {
  overflow-y: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
  padding: 0!important;
}

.click-through {
  pointer-events: none;
}

.get-click {
  pointer-events: all;
}

.dialog {
  background: transparent;
}

.menu__content {
  background-color: transparent!important;
}

@media only screen and (min-width: 600px) {
  .snack--left.snack--bottom, .snack--right.snack--bottom {
      -webkit-transform: translateY(-60px);
      transform: translateY(-60px);
  }
}

#stel {height: 100%; width: 100%; position: fixed;}
#stel-canvas {z-index: -10; width: 100%; height: 100%;}

.right_panel {
  padding-right: 400px;
}

</style>
