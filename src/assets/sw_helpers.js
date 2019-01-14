// Stellarium Web - Copyright (c) 2018 - Noctua Software Ltd
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

import Vue from 'vue'
import _ from 'lodash'
import StelWebEngine from '@/assets/js/stellarium-web-engine.js'
import NoctuaSkyClient from '@/assets/noctuasky-client'
import Moment from 'moment'
import { i18n } from '../plugins/i18n.js'
import langs from '../plugins/langs.js'

var DDDate = Date
DDDate.prototype.getJD = function () {
  return (this.getTime() / 86400000) + 2440587.5
}

DDDate.prototype.setJD = function (jd) {
  this.setTime((jd - 2440587.5) * 86400000)
}

DDDate.prototype.getMJD = function () {
  return this.getJD() - 2400000.5
}

DDDate.prototype.setMJD = function (mjd) {
  this.setJD(mjd + 2400000.5)
}

const swh = {
  initStelWebEngine: function (store, wasmFile, canvasElem, callBackOnDone) {
    let lstel = StelWebEngine({
      wasmFile: wasmFile,
      canvas: canvasElem,
      res: ['http://stelladata.noctua-software.com/surveys/stars/info.json'],
      onReady: function () {
        store.commit('replaceStelWebEngine', lstel.getTree())
        lstel.onValueChanged(function (path, value) {
          let tree = store.state.stel
          _.set(tree, path, value)
          store.commit('replaceStelWebEngine', tree)
        })
        Vue.prototype.$stel = lstel
        Vue.prototype.$selectionLayer = lstel.createLayer({id: 'slayer', z: 50, visible: true})
        Vue.prototype.$observingLayer = lstel.createLayer({id: 'obslayer', z: 40, visible: true})
        callBackOnDone()
      }
    })
  },

  addSelectedObjectExtraButtons: function (bt) {
    for (let i in this.selectedObjectExtraButtons) {
      if (this.selectedObjectExtraButtons[i].id === bt.id) {
        return
      }
    }
    this.selectedObjectExtraButtons.push(bt)
  },

  selectedObjectExtraButtons: [
  ],

  monthNames: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],

  astroConstants: {
    // Light time for 1 au in s
    ERFA_AULT: 499.004782,
    // Seconds per day
    ERFA_DAYSEC: 86400.0,
    // Days per Julian year
    ERFA_DJY: 365.25,
    // Astronomical unit in m
    ERFA_DAU: 149597870000
  },

  iconForSkySourceTypes: function (skySourceTypes) {
    // Array sorted by specificity, i.e. the most generic names at the end
    const iconForType = {
      // Stars
      'Pec?': 'star',
      '**?': 'double_star',
      '**': 'double_star',
      'V*': 'variable_star',
      'V*?': 'variable_star',
      '*': 'star',

      // Candidates
      'As?': 'group_of_stars',
      'SC?': 'group_of_galaxies',
      'Gr?': 'group_of_galaxies',
      'C?G': 'group_of_galaxies',
      'G?': 'galaxy',

      // Multiple objects
      'reg': 'region_defined_in_the_sky',
      'SCG': 'group_of_galaxies',
      'ClG': 'group_of_galaxies',
      'GrG': 'group_of_galaxies',
      'IG': 'interacting_galaxy',
      'PaG': 'pair_of_galaxies',
      'C?*': 'open_galactic_cluster',
      'Gl?': 'globular_cluster',
      'GlC': 'globular_cluster',
      'OpC': 'open_galactic_cluster',
      'Cl*': 'open_galactic_cluster',
      'As*': 'group_of_stars',
      'mul': 'multiple_objects',

      // Interstellar matter
      'PN?': 'planetary_nebula',
      'PN': 'planetary_nebula',
      'SNR': 'planetary_nebula',
      'SR?': 'planetary_nebula',
      'ISM': 'interstellar_matter',

      // Galaxies
      'PoG': 'part_of_galaxy',
      'QSO': 'quasar',
      'G': 'galaxy',

      'dso': 'deep_sky',

      // Solar System
      'Asa': 'artificial_satellite',
      'Moo': 'moon',
      'Sun': 'sun',
      'Pla': 'planet',
      'DPl': 'planet',
      'Com': 'comet',
      'MPl': 'minor_planet',
      'SSO': 'minor_planet',

      'Con': 'constellation'
    }
    for (let i in skySourceTypes) {
      if (skySourceTypes[i] in iconForType) {
        return '/static/images/svg/target_types/' + iconForType[skySourceTypes[i]] + '.svg'
      }
    }
    return '/static/images/svg/target_types/unknown.svg'
  },

  iconForSkySource: function (skySource) {
    return swh.iconForSkySourceTypes(skySource.types)
  },

  iconForObservation: function (obs) {
    if (obs && obs.target) {
      return this.iconForSkySource(obs.target)
    } else {
      return this.iconForSkySourceTypes(['reg'])
    }
  },

  cleanupOneSkySourceName: function (name) {
    const greek = {
      'alf': 'α',
      'bet': 'β',
      'gam': 'γ',
      'del': 'δ',
      'eps': 'ε',
      'zet': 'ζ',
      'eta': 'η',
      'tet': 'θ',
      'iot': 'ι',
      'kap': 'κ',
      'lam': 'λ',
      'mu': 'μ',
      'mu.': 'μ',
      'nu': 'ν',
      'nu.': 'ν',
      'xi': 'ξ',
      'xi.': 'ξ',
      'omi': 'ο',
      'pi': 'π',
      'pi.': 'π',
      'rho': 'ρ',
      'sig': 'σ',
      'tau': 'τ',
      'ups': 'υ',
      'phi': 'φ',
      'chi': 'χ',
      'psi': 'ψ',
      'ome': 'ω'
    }

    if (name.startsWith('* ')) {
      let ll = name.substring(2, 5).trim()
      if (ll in greek) {
        name = greek[ll] + name.substring(name[5] === '0' ? 6 : 5)
      } else {
        name = name.substring(2)
      }
    }

    if (name.startsWith('V* ')) {
      let ll = name.substring(3, 6).trim().toLowerCase()
      if (ll in greek) {
        name = greek[ll] + ' ' + name.substring(name[6] === '0' ? 7 : 6)
      } else {
        name = name.substring(3)
      }
    }
    name = name.replace(/^Cl /, '')
    name = name.replace(/^Cl\* /, '')
    name = name.replace(/^NAME /, '')
    name = name.replace(/^\*\* /, '')
    return name
  },

  sortedNamesForSkySource: function (skySource) {
    // Return a dict with 3 lists of cleaned up names sorted by importance
    if (!skySource || !skySource.names) {
      return ['?']
    }
    return skySource.names.map(this.cleanupOneSkySourceName)
  },

  nameForSkySource: function (skySource) {
    if (!skySource || !skySource.names) {
      return '?'
    }
    return this.cleanupOneSkySourceName(skySource.names[0])
  },

  nameForSkySourceType: function (skySourceType) {
    const nameForType = {
      '*': i18n.t('object_type.star'),
      '**': i18n.t('object_type.double_star'),
      '**?': i18n.t('object_type.physical_binary_candidate'),
      '*i*': i18n.t('object_type.star_double_system'),
      '*iA': i18n.t('object_type.star_association'),
      '*iC': i18n.t('object_type.star_cluster'),
      '*iN': i18n.t('object_type.star_nebula'),
      '..?': i18n.t('object_type.candidate'),
      '?': i18n.t('object_type.unknown'),
      'AB*': i18n.t('object_type.asymptotic_giant_branch_star_he'),
      'AB?': i18n.t('object_type.asymptotic_giant_branch_star_candidate'),
      'ACo': i18n.t('object_type.minor_planet'),
      'AG?': i18n.t('object_type.active_galaxy_nucleus_possible'),
      'AGN': i18n.t('object_type.active_galaxy_nucleus'),
      'ALS': i18n.t('object_type.absorption_line_system'),
      'AM*': i18n.t('object_type.cv_am_her_type'),
      'Ae*': i18n.t('object_type.herbig_ae_be'),
      'Ae?': i18n.t('object_type.herbig_ae_be_possible'),
      'Al*': i18n.t('object_type.algol_eclipsing'),
      'Amo': i18n.t('object_type.amor'),
      'Apo': i18n.t('object_type.apollo'),
      'As*': i18n.t('object_type.association_stars'),
      'As?': i18n.t('object_type.association_stars_possible'),
      'Asa': i18n.t('object_type.artificial_satellite'),
      'Ate': i18n.t('object_type.aten'),
      'Ati': i18n.t('object_type.atira'),
      'BAL': i18n.t('object_type.broad_absorption_line_system'),
      'BD*': i18n.t('object_type.brown_dwarf'),
      'BD?': i18n.t('object_type.brown_dwarf_candidate'),
      'BH?': i18n.t('object_type.black_hole_candidate'),
      'BL?': i18n.t('object_type.bl_lac_possible'),
      'BLL': i18n.t('object_type.bl_lac'),
      'BNe': i18n.t('object_type.bright_nebula'),
      'BS*': i18n.t('object_type.blue_straggler'),
      'BS?': i18n.t('object_type.blue_straggler_candidate'),
      'BY*': i18n.t('object_type.var_by_dra'),
      'Be*': i18n.t('object_type.be_star'),
      'Be?': i18n.t('object_type.be_star_possible'),
      'BiC': i18n.t('object_type.brightest_galaxy_in_cluster'),
      'Bla': i18n.t('object_type.blazar'),
      'Bz?': i18n.t('object_type.blazar_possible'),
      'C*': i18n.t('object_type.carbon_star'),
      'C*?': i18n.t('object_type.carbon_star_possible'),
      'C?*': i18n.t('object_type.open_star_cluster_possible'),
      'C?G': i18n.t('object_type.cluster_of_galaxies_possible'),
      'CCo': i18n.t('object_type.non_periodic_comet'),
      'CGG': i18n.t('object_type.compact_group_of_galaxies'),
      'CGb': i18n.t('object_type.cometary_globule'),
      'CH*': i18n.t('object_type.star_ch_type_envelope'),
      'CH?': i18n.t('object_type.star_ch_type_envelope_possible'),
      'CV*': i18n.t('object_type.cataclysmic_var_star'),
      'CV?': i18n.t('object_type.cataclysmic_binary_candidate'),
      'Ce*': i18n.t('object_type.cepheid_var'),
      'Ce?': i18n.t('object_type.cepheid_var_possible'),
      'Cl*': i18n.t('object_type.cluster_of_stars'),
      'ClG': i18n.t('object_type.cluster_of_galaxies'),
      'Cld': i18n.t('object_type.cloud'),
      'Com': i18n.t('object_type.comet'),
      'Con': i18n.t('object_type.constellation'),
      'Cul': i18n.t('object_type.cultural_sky_representation'),
      'DCo': i18n.t('object_type.disappeared_comet'),
      'DLA': i18n.t('object_type.damped_ly_a'),
      'DN*': i18n.t('object_type.dwarf_nova'),
      'DNe': i18n.t('object_type.dark_cloud'),
      'DOA': i18n.t('object_type.distant_object_asteroid'),
      'DPl': i18n.t('object_type.dwarf_planet'),
      'DQ*': i18n.t('object_type.cv_dq_her'),
      'EB*': i18n.t('object_type.eclipsing_binary'),
      'EB?': i18n.t('object_type.eclipsing_binary_candidate'),
      'EP*': i18n.t('object_type.eclipse_planet'),
      'ERO': i18n.t('object_type.extremely_red_object'),
      'El*': i18n.t('object_type.ellipsoidal_var'),
      'Em*': i18n.t('object_type.emission_line_star'),
      'EmG': i18n.t('object_type.emission_line_galaxy'),
      'EmO': i18n.t('object_type.emission_object'),
      'Er*': i18n.t('object_type.eruptive_var'),
      'FIR': i18n.t('object_type.far_ir'),
      'FU*': i18n.t('object_type.var_fu_ori'),
      'Fl*': i18n.t('object_type.flare_star'),
      'G': i18n.t('object_type.galaxy'),
      'G?': i18n.t('object_type.galaxy_possible'),
      'GNe': i18n.t('object_type.galactic_nebula'),
      'GWE': i18n.t('object_type.grav_wave_event'),
      'GiC': i18n.t('object_type.galaxy_in_cluster'),
      'GiG': i18n.t('object_type.galaxy_in_group'),
      'GiP': i18n.t('object_type.galaxy_in_pair'),
      'Gl?': i18n.t('object_type.globular_cluster_possible'),
      'GlC': i18n.t('object_type.globular_cluster'),
      'Gr?': i18n.t('object_type.group_of_galaxies_possible'),
      'GrG': i18n.t('object_type.group_of_galaxies'),
      'H2G': i18n.t('object_type.hii_galaxy'),
      'HB*': i18n.t('object_type.horizontal_branch_star'),
      'HB?': i18n.t('object_type.horizontal_branch_star_possible'),
      'HH': i18n.t('object_type.herbig_haro'),
      'HI': i18n.t('object_type.hi'),
      'HII': i18n.t('object_type.hii'),
      'HS*': i18n.t('object_type.hot_subdwarf'),
      'HS?': i18n.t('object_type.hot_subdwarf_candidate'),
      'HV*': i18n.t('object_type.high_velocity_star'),
      'HVC': i18n.t('object_type.high_velocity_cloud'),
      'HX?': i18n.t('object_type.high_mass_xray_binary_candidate'),
      'HXB': i18n.t('object_type.high_mass_xray_binary'),
      'Hil': i18n.t('object_type.hilda'),
      'Hun': i18n.t('object_type.hungaria'),
      'HzG': i18n.t('object_type.galaxy_redshift'),
      'IG': i18n.t('object_type.interacting_galaxies'),
      'IPS': i18n.t('object_type.interplanetary_spacecraft'),
      'IR': i18n.t('object_type.ir_source'),
      'ISM': i18n.t('object_type.interstellar_matter'),
      'ISt': i18n.t('object_type.interstellar_object'),
      'Ir*': i18n.t('object_type.var_star_irregular'),
      'JTA': i18n.t('object_type.jupiter_trojan'),
      'LI?': i18n.t('object_type.grav_lensed_image_possible'),
      'LIN': i18n.t('object_type.liner_nucleus'),
      'LLS': i18n.t('object_type.lyman_limit_system'),
      'LM*': i18n.t('object_type.low_mass_star'),
      'LM?': i18n.t('object_type.low_mass_star_candidate'),
      'LP*': i18n.t('object_type.long_period_var'),
      'LP?': i18n.t('object_type.long_period_var_candidate'),
      'LS?': i18n.t('object_type.grav_lens_system_possible'),
      'LSB': i18n.t('object_type.low_surface_brightness_galaxy'),
      'LX?': i18n.t('object_type.low_mass_xray_bin_candidate'),
      'LXB': i18n.t('object_type.low_mass_xray_bin'),
      'Le?': i18n.t('object_type.grav_lens_possible'),
      'LeG': i18n.t('object_type.grav_lensed_image_galaxy'),
      'LeI': i18n.t('object_type.grav_lensed_image'),
      'LeQ': i18n.t('object_type.grav_lensed_image_quasar'),
      'Lev': i18n.t('object_type.m_lensing_event'),
      'LyA': i18n.t('object_type.ly_a_absorption_line_system'),
      'MBA': i18n.t('object_type.main_belt_asteroid'),
      'MGr': i18n.t('object_type.moving_group'),
      'MPl': i18n.t('object_type.minor_planet_obj'),
      'Mas': i18n.t('object_type.maser'),
      'Mi*': i18n.t('object_type.var_star_mira_cet'),
      'Mi?': i18n.t('object_type.mira_candidate'),
      'MoC': i18n.t('object_type.molecular_cloud'),
      'Moo': i18n.t('object_type.natural_satellite'),
      'N*': i18n.t('object_type.neutron_star'),
      'N*?': i18n.t('object_type.neutron_star_candidate'),
      'NEO': i18n.t('object_type.neo'),
      'NIR': i18n.t('object_type.nir'),
      'NL*': i18n.t('object_type.nova_like_star'),
      'No*': i18n.t('object_type.nova'),
      'No?': i18n.t('object_type.nova_candidate'),
      'OH*': i18n.t('object_type.oh_ir_star'),
      'OH?': i18n.t('object_type.oh_ir_star_candidate'),
      'OVV': i18n.t('object_type.ovvo'),
      'OpC': i18n.t('object_type.open_cluster'),
      'Or*': i18n.t('object_type.var_star_orion'),
      'PCo': i18n.t('object_type.periodic_comet'),
      'PM*': i18n.t('object_type.high_prop_motion_star'),
      'PN': i18n.t('object_type.planetary_nebula'),
      'PN?': i18n.t('object_type.planetary_nebula_possible'),
      'PaG': i18n.t('object_type.pair_of_galaxies'),
      'Pe*': i18n.t('object_type.peculiar_star'),
      'Pec?': i18n.t('object_type.peculiar_star_possible'),
      'Pho': i18n.t('object_type.phocaea'),
      'Pl': i18n.t('object_type.extra_solar_planet'),
      'Pl?': i18n.t('object_type.extra_solar_planet_candidate'),
      'Pla': i18n.t('object_type.planet'),
      'PoC': i18n.t('object_type.part_of_cloud'),
      'PoG': i18n.t('object_type.part_of_galaxy'),
      'Psr': i18n.t('object_type.pulsar'),
      'Pu*': i18n.t('object_type.pulsating_var_star'),
      'Q?': i18n.t('object_type.quasar_possible'),
      'QSO': i18n.t('object_type.quasar'),
      'RB?': i18n.t('object_type.red_giant_star_possible'),
      'RC*': i18n.t('object_type.var_star_r_crb'),
      'RC?': i18n.t('object_type.var_star_r_crb_candidate'),
      'RG*': i18n.t('object_type.red_giant_star'),
      'RI*': i18n.t('object_type.var_star_rapid'),
      'RNe': i18n.t('object_type.reflection_nebula'),
      'RR*': i18n.t('object_type.var_star_rr_lyr'),
      'RR?': i18n.t('object_type.var_star_rr_lyr_possible'),
      'RS*': i18n.t('object_type.var_star_rs_cvn'),
      'RV*': i18n.t('object_type.var_star_rv_tau'),
      'Rad': i18n.t('object_type.radio_source'),
      'Ro*': i18n.t('object_type.rot_var_star'),
      'S*': i18n.t('object_type.s_star'),
      'S*?': i18n.t('object_type.s_star_possible'),
      'SB*': i18n.t('object_type.spectro_bin'),
      'SBG': i18n.t('object_type.starburst_galaxy'),
      'SC?': i18n.t('object_type.supercluster_possible'),
      'SCG': i18n.t('object_type.supercluster'),
      'SFR': i18n.t('object_type.star_forming_region'),
      'SN*': i18n.t('object_type.supernova'),
      'SN?': i18n.t('object_type.supernova_candidate'),
      'SNR': i18n.t('object_type.supernova_remnant'),
      'SR?': i18n.t('object_type.supernova_remnant_candidate'),
      'SSO': i18n.t('object_type.solar_system_object'),
      'SX*': i18n.t('object_type.var_star_sx_phe'),
      'St*': i18n.t('object_type.stellar_stream'),
      'Sun': i18n.t('object_type.sun'),
      'Sy*': i18n.t('object_type.symbiotic_star'),
      'Sy1': i18n.t('object_type.sy1_galaxy'),
      'Sy2': i18n.t('object_type.sy2_galaxy'),
      'Sy?': i18n.t('object_type.symbiotic_star_candidate'),
      'SyG': i18n.t('object_type.sy_galaxy'),
      'TT*': i18n.t('object_type.t_tau_star'),
      'TT?': i18n.t('object_type.t_tau_star_candidate'),
      'ULX': i18n.t('object_type.ultra_luminous_xray'),
      'UV': i18n.t('object_type.uv_source'),
      'UX?': i18n.t('object_type.ultra_luminous_xray_candidate'),
      'V*': i18n.t('object_type.var_star'),
      'V*?': i18n.t('object_type.var_star_suspected'),
      'WD*': i18n.t('object_type.white_dwarf'),
      'WD?': i18n.t('object_type.white_dwarf_candidate'),
      'WR*': i18n.t('object_type.wolf_rayet_star'),
      'WR?': i18n.t('object_type.wolf_rayet_star_possible'),
      'WU*': i18n.t('object_type.eclipsing_bin_w_uma'),
      'WV*': i18n.t('object_type.var_star_w_vir'),
      'X': i18n.t('object_type.xray_source'),
      'XB*': i18n.t('object_type.xray_bin'),
      'XB?': i18n.t('object_type.xray_bin_candidate'),
      'XCo': i18n.t('object_type.historical_comet'),
      'Y*?': i18n.t('object_type.young_stellar_object_candidate'),
      'Y*O': i18n.t('object_type.young_stellar_object'),
      'ZZ*': i18n.t('object_type.pulsating_white_dwarf'),
      'a2*': i18n.t('object_type.var_star_a2_cvn'),
      'bC*': i18n.t('object_type.var_star_b_cep'),
      'bCG': i18n.t('object_type.blue_compact_galaxy'),
      'bL*': i18n.t('object_type.eclipsing_bin_b_lyr'),
      'blu': i18n.t('object_type.blue_object'),
      'bub': i18n.t('object_type.bubble'),
      'cC*': i18n.t('object_type.cepheid'),
      'cir': i18n.t('object_type.circumstellar_matter'),
      'cm': i18n.t('object_type.cm_radio'),
      'cor': i18n.t('object_type.core'),
      'dS*': i18n.t('object_type.var_star_delta_sct'),
      'err': i18n.t('object_type.error'),
      'ev': i18n.t('object_type.transient_event'),
      'gB': i18n.t('object_type.gamma_ray_burst'),
      'gD*': i18n.t('object_type.var_star_g_dor'),
      'gLS': i18n.t('object_type.grav_lens_system'),
      'gLe': i18n.t('object_type.grav_lens'),
      'gam': i18n.t('object_type.gamma_ray_source'),
      'glb': i18n.t('object_type.globule'),
      'grv': i18n.t('object_type.grav_source'),
      'mAL': i18n.t('object_type.metallic_abs_line_system'),
      'mR': i18n.t('object_type.m_radio'),
      'mm': i18n.t('object_type.mm_radio'),
      'mul': i18n.t('object_type.composite_obj'),
      'of?': i18n.t('object_type.outflow_candidate'),
      'out': i18n.t('object_type.outflow'),
      'pA*': i18n.t('object_type.post_agb'),
      'pA?': i18n.t('object_type.post_agb_candidate'),
      'pr*': i18n.t('object_type.pre_main_sequence'),
      'pr?': i18n.t('object_type.pre_main_sequence_candidate'),
      'rB': i18n.t('object_type.radio_burst'),
      'rG': i18n.t('object_type.radio_galaxy'),
      'red': i18n.t('object_type.red_source'),
      'reg': i18n.t('object_type.region'),
      's*b': i18n.t('object_type.blue_star'),
      's*r': i18n.t('object_type.red_star'),
      's*y': i18n.t('object_type.yellow_star'),
      's?b': i18n.t('object_type.blue_star_candidate'),
      's?r': i18n.t('object_type.red_star_candidate'),
      's?y': i18n.t('object_type.yellow_star_candidate'),
      'sg*': i18n.t('object_type.evolved_supergiant'),
      'sg?': i18n.t('object_type.supergiant_possible'),
      'sh': i18n.t('object_type.hi_shell'),
      'smm': i18n.t('object_type.sub_mm'),
      'sr*': i18n.t('object_type.semi_regular_pulsating_star'),
      'su*': i18n.t('object_type.substellar_object'),
      'sv?': i18n.t('object_type.semi_regular_var_candidate'),
      'vid': i18n.t('object_type.underdense')
    }
    let res = nameForType[skySourceType]
    return res || 'Unknown Type'
  },

  nameForGalaxyMorpho: function (morpho) {
    const galTab = {
      'E': i18n.t('galaxy_type.elliptical'),
      'SB': i18n.t('galaxy_type.bar_spiral'),
      'SAB': i18n.t('galaxy_type.int_spiral'),
      'SA': i18n.t('galaxy_type.spiral'),
      'S0': i18n.t('galaxy_type.lenticular'),
      'S': i18n.t('galaxy_type.spiral'),
      'Im': i18n.t('galaxy_type.irregular'),
      'dSph': i18n.t('galaxy_type.dwf_spheroidal'),
      'dE': i18n.t('galaxy_type.dwf_elliptical')
    }
    for (let morp in galTab) {
      if (morpho.startsWith(morp)) {
        return galTab[morp]
      }
    }
    return ''
  },

  // Return the list of FOV in degree which are adapted to observe this object
  fovsForSkySource: function (ss) {
    switch (ss.model) {
      case 'star':
        return [20, 2]
      case 'dso':
        let dimx = 'dimx' in ss.model_data ? ss.model_data.dimx : 5
        let dimy = 'dimy' in ss.model_data ? ss.model_data.dimy : 5
        return [20, Math.max(dimx, dimy) * 8 / 60]
      case 'jpl_sso':
        return [20, 1 / 60]
      case 'mpc_asteroid':
      case 'mpc_comet':
      case 'tle_satellite':
        return [20, 10 / 60, 1 / 60]
      case 'constellation':
        return [50]
      default:
        return [20]
    }
  },

  getShareLink: function (context) {
    let link = 'https://stellarium-web.org/'
    if (context.$store.state.selectedObject) {
      link += 'skysource/' + context.$store.state.selectedObject.short_name
    }
    link += '?'
    link += 'fov=' + (context.$store.state.stel.fov * 180 / Math.PI).toPrecision(5)
    let d = new Date()
    d.setMJD(context.$stel.core.observer.utc)
    link += '&date=' + new Moment(d).utc().format()
    link += '&lat=' + (context.$stel.core.observer.latitude * 180 / Math.PI).toFixed(2)
    link += '&lng=' + (context.$stel.core.observer.longitude * 180 / Math.PI).toFixed(2)
    link += '&elev=' + context.$stel.core.observer.elevation
    if (!context.$store.state.selectedObject) {
      link += '&az=' + (context.$stel.core.observer.azimuth * 180 / Math.PI).toPrecision(5)
      link += '&alt=' + (context.$stel.core.observer.altitude * 180 / Math.PI).toPrecision(5)
    }
    return link
  },

  // Return a SweObj matching a passed sky source JSON object if it's already instanciated in SWE
  skySource2SweObj: function (ss) {
    if (!ss || !ss.model) {
      return undefined
    }
    let $stel = Vue.prototype.$stel
    let obj
    if (ss.model === 'dso') {
      obj = $stel.getObjByNSID(ss.nsid)
    } else if (ss.model === 'tle_satellite') {
      let id = 'NORAD ' + ss.model_data.norad_number
      obj = $stel.getObj(id)
    } else if (ss.model === 'constellation' && ss.model_data.iau_abbreviation) {
      let id = 'CST ' + ss.model_data.iau_abbreviation
      obj = $stel.getObj(id)
    } else {
      obj = $stel.getObjByNSID(ss.nsid)
    }
    if (!obj) {
      obj = $stel.getObj(ss.names[0])
    }
    if (obj === null) return undefined
    return obj
  },

  sweObj2SkySource: function (obj) {
    let $stel = Vue.prototype.$stel
    let names = obj.names()

    if (!names || !names.length) {
      throw new Error("Can't find object without names")
    }

    let printErr = function (err, n) {
      let gaiaName
      for (let i in names) {
        if (names[i].startsWith('GAIA')) {
          gaiaName = names[i]
        }
      }
      if (gaiaName) {
        console.log('Generate Gaia object info from StelWebEngine object')
        let radecICRS = $stel.c2s(obj.icrs)
        let raICRS = $stel.anp(radecICRS[0])
        let decICRS = $stel.anpm(radecICRS[1])
        let ss = {
          model: 'star',
          types: ['*'],
          names: [obj.name.replace(/^GAIA /, 'Gaia DR2 ')],
          modelData: {
            Vmag: obj.vmag.v,
            ra: raICRS * 180 / Math.PI,
            de: decICRS * 180 / Math.PI
          }
        }
        return ss
      }
      console.log(err)
      console.log("Couldn't find skysource for name: " + n)
      throw err
    }

    return NoctuaSkyClient.skysources.getByName(names[0]).then(res => {
      return res
    }, err => {
      if (names.length === 1) return printErr(err, names[0])
      return NoctuaSkyClient.skysources.getByName(names[1]).then(res => {
        return res
      }, err => {
        if (names.length === 2) return printErr(err, names[1])
        return NoctuaSkyClient.skysources.getByName(names[2]).then(res => {
          return res
        }, err => {
          return printErr(err, names[2])
        })
      })
    })
  },

  setSweObjAsSelection: function (obj) {
    let $stel = Vue.prototype.$stel
    obj.update()
    $stel.core.selection = obj
    $stel.core.lock = obj
    $stel.core.lock.update()
    let azalt = $stel.convertPosition($stel.core.observer, 'ICRS', 'OBSERVED', $stel.core.lock.icrs)
    $stel.core.lookat(azalt, 1.0)
  },

  // Get data for a SkySource from wikipedia
  getSkySourceSummaryFromWikipedia: function (ss) {
    let title
    console.log(ss.short_name)
    if (ss.model === 'jpl_sso') {
      title = ss.short_name.toLowerCase()
      if (title === 'sun' || title === 'moon') {
        title = title.replace(title, i18n.t(`planets.${title}`))
      } else {
        if (['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].indexOf(title) > -1) {
          title = title.replace(title, i18n.t(`planets.${title}`))
          title = title + '_(' + i18n.t('planets.planet') + ')'
        }
        if (ss.types[0] === 'Moo') {
          title = title + '_(' + i18n.t('planets.moon') + ')'
        }
      }
    }
    if (ss.model === 'mpc_asteroid') {
      title = ss.short_name
    }
    if (ss.model === 'constellation') {
      title = ss.short_name + '_(' + i18n.t('general.constellation') + ')'
    }
    if (ss.model === 'dso') {
      for (let i in ss.names) {
        if (ss.names[i].startsWith('M ')) {
          title = 'Messier_' + ss.names[i].substr(2)
          break
        }
        if (ss.names[i].startsWith('NGC ')) {
          title = ss.names[i]
          break
        }
        if (ss.names[i].startsWith('IC ')) {
          title = ss.names[i]
          break
        }
      }
    }
    if (ss.model === 'star') {
      if (ss.short_name !== undefined) {
        title = ss.short_name
      } else {
        for (let i in ss.names) {
          if (ss.names[i].startsWith('NAME')) {
            title = this.cleanupOneSkySourceName(ss.names[i])
          }
        }
      }
      if (title === undefined) {
        for (let i in ss.names) {
          if (ss.names[i].startsWith('* ')) {
            title = this.cleanupOneSkySourceName(ss.names[i])
          }
        }
      }
    }
    if (!title) return Promise.reject(new Error("Can't find wikipedia compatible name"))

    var language = langs.language()

    return fetch('https://' + language + '.wikipedia.org/w/api.php?action=query&redirects&prop=extracts&exintro&exlimit=1&exchars=300&format=json&origin=*&titles=' + title,
      {headers: { 'Content-Type': 'application/json; charset=UTF-8' }})
      .then(response => {
        return response.json()
      })
  },

  getGeolocation: function (vueInstance) {
    console.log('Getting geolocalization')
    var that = vueInstance

    if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(function (position) {
          var pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          resolve(pos)
        }, function () {
          reject(new Error('Error getting location from browser'))
        }, { enableHighAccuracy: true })
      })
    }

    // No HTML5 Geolocalization support, try with GEOIP
    console.log('Browser don\'t support geolocation, try from GeoIP')
    return that.$jsonp('https://geoip-db.com/jsonp', {callbackName: 'callback'})
      .then(location => {
        var pos = {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: 50000
        }
        return pos
      }, err => { console.log(err) })
  },

  geoCodePosition: function (pos) {
    console.log('Geocoding Position: ' + JSON.stringify(pos))
    /* eslint-disable no-undef */
    var geocoder = new google.maps.Geocoder()
    var loc = {
      shortName: (pos.accuracy > 500 ? 'Near ' : '') + 'Lat ' + pos.lat.toFixed(3) + '° Lon ' + pos.lng.toFixed(3) + '°',
      country: 'Unknown',
      lng: pos.lng,
      lat: pos.lat,
      alt: pos.alt ? pos.alt : 0,
      accuracy: pos.accuracy,
      streetAddress: ''
    }
    return new Promise((resolve, reject) => {
      window.gm_authFailure = function () {
        // This happens when the map API is not usable for some reasons
        console.log('Google maps service failed to geocode, fallback to just position')
        resolve(loc)
      }
      geocoder.geocode({ 'location': {lat: pos.lat, lng: pos.lng} }, function (results, status) {
        if (status === 'OK') {
          if (results.length > 0) {
            let localityFound = false
            for (let c of results[0].address_components) {
              if (c.types.includes('locality')) {
                localityFound = true
                loc.shortName = (pos.accuracy > 500 ? 'Near ' : '') + c.short_name
              }
              if (c.types.includes('postal_town') && !localityFound) {
                loc.shortName = (pos.accuracy > 500 ? 'Near ' : '') + c.short_name
              }
              if (c.types.includes('neighborhood') && !localityFound) {
                loc.shortName = (pos.accuracy > 500 ? 'Near ' : '') + c.short_name
              }
              if (c.types.includes('administrative_area_level_2') && !localityFound) {
                loc.shortName = (pos.accuracy > 500 ? 'Near ' : '') + c.short_name
              }
              if (c.types.includes('country')) {
                loc.country = c.long_name
              }
            }
            if (pos.accuracy < 50) {
              for (let c of results[0].address_components) {
                if (c.types.includes('street_number')) {
                  loc.streetAddress = c.short_name
                }
                if (c.types.includes('route')) {
                  loc.streetAddress = loc.streetAddress + ' ' + c.short_name
                }
              }
            }
            resolve(loc)
          } else {
            console.log('Geocoder returned nothing')
            resolve(loc)
          }
        } else {
          console.log('Geocoder failed due to: ' + status)
          resolve(loc)
        }
      })
    })
  },

  getDistanceFromLatLonInM: function (lat1, lon1, lat2, lon2) {
    var deg2rad = function (deg) {
      return deg * (Math.PI / 180)
    }
    var R = 6371000 // Radius of the earth in m
    var dLat = deg2rad(lat2 - lat1)
    var dLon = deg2rad(lon2 - lon1)
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    var d = R * c // Distance in m
    return d
  }
}

export default swh
