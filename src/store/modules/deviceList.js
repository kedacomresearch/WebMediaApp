/**
 * Created by Gan on 2017/11/2.
 */

import axios from 'axios'

const state = {
  list: [],
  indexSelected: null,
  ptzDisabled: true,
  streamConfig: [],
  streamUri: null
};

const getters = {
  deviceList: state => {
    return state.list;
  },

  indexSelected: state => {
    return state.indexSelected;
  },

  ptzDisabled: state => {
    return state.ptzDisabled
  }
};

const mutations = {
  updateData(state, payload) {
    switch (payload.name) {
      case 'list':
        state.list = payload.data;
        break;
      case 'index':
        state.indexSelected = payload.data;
        break;
      case 'ptzDisabled':
        state.ptzDisabled = payload.data;
        break;
      case 'streamConfig':
        state.streamConfig = payload.data;
        break;
      case 'streamUri':
        state.streamUri = payload.data;
        break;
      default:
        console.log('Error:Dont directly mutate Vuex store');
    }
  }
};

const actions = {
  /**
   * Get Device List
   * new Promise((resolve, reject) => {})
   */
  getDeviceList({commit}, payload) {
    return new Promise( (resolve, reject) => {
      axios.get('/wms/device/registered')
        .then( res => {
          commit({
            type: 'updateData',
            data: res.data,
            name: 'list'
          });
          resolve();
        })
        .catch( err => {
          reject();
        });
    });
  },
  /**
   * Get IPC Stream Configuration
   * new Promise((resolve, reject) => {})
   */
  getStreamConfig({commit}, payload) {
    console.log(`getStreamConfig, ip: ${payload.ip}`);
    return new Promise( (resolve, reject) => {
      axios.get(`/wms/pwvms/media/streamconfig?ip=${payload.ip}`)
        .then( res => {
          console.log(`streamConfig:`);
          console.log(res.data.videoConfig);
          console.log(`ptzEnabled:`);
          console.log(res.data.ptzEnabled);
          commit({
            type: 'updateData',
            data: res.data.videoConfig,
            name: 'streamConfig'
          });
          commit({
            type: 'updateData',
            data: !res.data.ptzEnabled,
            name: 'ptzDisabled'
          });
          resolve();
        })
        .catch( err => {
          reject(err);
        });
    });
  },
  /**
   * Get IPC Stream Uri
   * new Promise((resolve, reject) => {})
   */
  getStreamUri({commit}, payload) {
    console.log(`getStreamUri, ip: ${payload.ip}`);
    console.log(`getStreamUri, profileToken: ${payload.profileToken}`);
    return new Promise( (resolve, reject) => {
      axios.get(`/wms/pwvms/media/streamuri?ip=${payload.ip}&profileToken=${payload.profileToken}`)
        .then( res => {
          commit({
            type: 'updateData',
            data: res.data,
            name: 'streamUri'
          });
          resolve();
        })
        .catch( err => {
          reject(err);
        });
    });
  },
  getDevicePtzNodes({state, commit}) {
    return new Promise( (resolve, reject) => {
      console.log('getDevicePtzNodes ip:' + state.list[state.indexSelected].ip);
      axios.get(`/wms/pwvms/ptz/nodes?ip=${state.list[state.indexSelected].ip}`)
        .then(res => {
          console.log('getDevicePtzNodes sucess:');
          console.log(res.data);
          if(res.data) {
            commit({
              type: 'updateData',
              data: res.data.ptzNodes ? false : true,
              name: 'ptzDisabled'
            });
          }
          resolve(res.data);
        })
        .catch(err => {
          console.log('getDevicePtzNodes error:');
          console.log(err.message);
          reject(err);
        })
    })
  },
  devicePtzCtrl ({commit}, payload) {
    return new Promise( (resolve, reject) => {
      let ptzCmd = Object.create(null),
        speed = 0.3;
      switch (payload.direction ){
        case 'up':
          ptzCmd = {
            tilt: {
              direction: 'up',
              speed: speed
            }
          }
          break;
        case 'down':
          ptzCmd = {
            tilt: {
              direction: 'down',
              speed: speed
            }
          }
          break;
        case 'left':
          ptzCmd = {
            pan: {
              direction: 'left',
              speed: speed
            }
          }
          break;
        case 'right':
          ptzCmd = {
            pan: {
              direction: 'right',
              speed: speed
            }
          }
          break;
        case 'zoomIn':
          ptzCmd = {
            zoom: {
              direction: 'in',
              speed: speed
            }
          }
          break;
        case 'zoomOut':
          ptzCmd = {
            zoom: {
              direction: 'out',
              speed: speed
            }
          }
          break;
        case 'stop':
          ptzCmd = {
            tilt:null,
            pan: null,
            zoom: null
          }
          break;
        default:
          ptzCmd = null;
          reject(new Error('ptz direction error!'));
          break;
      }

      if(ptzCmd) {
        axios.post(`/wms/pwvms/ptz/command?ip=${payload.ip}`, {
          ptzCmd: ptzCmd
        })
          .then( res => {
            resolve(res);
          })
          .catch(err => {
            reject(err);
          })
      }
    });
  }
};


export default {
  state,
  getters,
  mutations,
  actions
}
