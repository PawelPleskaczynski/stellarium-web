// Stellarium Web - Copyright (c) 2018 - Noctua Software Ltd
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
<v-dialog lazy max-width="600" v-model="$store.state.showAboutDialog">
  <v-card v-if="$store.state.showAboutDialog" class="secondary white--text">
    <v-card-title><div class="headline">{{ $t('ui.about_dialog.title') }}</div></v-card-title>
    <v-card-text>
      <p>{{ $t('ui.about_dialog.line1') }}
      {{ $t('ui.about_dialog.line2p1') }}<a href="mailto:contact@noctua-software.com">contact@noctua-software.com</a>{{ $t('ui.about_dialog.line2p2') }}<a href="https://github.com/Stellarium/stellarium-web" target="_blank">{{ $t('ui.about_dialog.line2p3') }}</a>.</p>

      <p>{{ $t('ui.about_dialog.line3p1') }}<a v-on:click.stop="$store.state.showPrivacyDialog = true">{{ $t('ui.about_dialog.line3p2') }}</a></p>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer><v-btn class="blue--text darken-1" flat @click.native="$store.state.showAboutDialog = false">Close</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
</template>

<script>
  export default {
    data: function () {
      return {
      }
    },
    methods: {
    }
  }
</script>

<style>
a {
  color: #82b1ff;
}
</style>
