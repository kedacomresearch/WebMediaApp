/**
 * Created by Gan on 2017/11/2.
 */

import Vue from 'vue'
import Vuex from 'vuex'

import deviceList from './modules/deviceList.js'
import webMediaService from './modules/webMediaService'

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    deviceList,
    webMediaService
  }
})
