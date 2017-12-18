/**
 * Created by GanChao on 2017/12/15.
 */

import axios from 'axios'
import webStreamer from '@/libs/webStreamer/webStreamer'

const state = {

};

const getters = {

};

const mutations = {

};

const actions = {
  /**
   * Create Live Stream
   * new Promise((resolve, reject) => {})
   */
  createLiveStream({commit}, payload) {
    let uri = payload.uri;
    console.log(`createLiveStream uri: ${uri}`);
    let bodyObj = {
      source: {
        type: 'rtsp',
        options: {
          rtsp: {
            url: uri
          }
        }
      }
    };
    return new Promise( (resolve, reject) => {
      axios.post('/wms/webmedia/livestream', bodyObj)
        .then( res => {
          if(res.status === 200) {
            console.log(`createLiveStream streamId: ${res.data.streamId}`);
            resolve(res.data.streamId);
          } else {
            reject(Error(`Create Live Stream Error!\n ${res.message}`));
          }
        })
        .catch( err => {
          reject(err);
        });
    });
  },
  /**
   * Add Live Stream Viewer
   * new Promise((resolve, reject) => {})
   */
  addLiveStreamViewer({commit}, payload) {
    let streamId = payload.streamId;

    console.log(`addLiveStreamViewer streamId: ${streamId}`);
    let bodyObj = {
      type: 'webrtc',
      Id: streamId.toString(),
      video: 'recvonly',
      audio: 'recvonly',
    };
    return new Promise( (resolve, reject) => {
      axios.post('/wms/webmedia/livestream/viewer', bodyObj)
        .then( res => {
          if(res.status === 200) {
            console.log(`addLiveStreamViewer viewerId: ${res.data.viewerId}`);
            console.log(`addLiveStreamViewer signalingBridge: ${res.data.signalingBridge}`);
            resolve({
              viewerId: res.data.viewerId,
              signalingBridge: res.data.signalingBridge
            });
          } else {
            reject(Error(`Add Live Stream Viewer Error!\n ${res.message}`));
          }
        })
        .catch( err => {
          reject(err);
        });
    });
  },
  /**
   * Remove Live Stream Viewer
   * new Promise((resolve, reject) => {})
   */
  removeLiveStreamViewer({commit}, payload) {
    let streamId = payload.streamId,
      viewerId = payload.viewerId;
    console.log(`removeLiveStreamViewer viewerId: ${viewerId}`);
    console.log(`removeLiveStreamViewer streamId: ${streamId}`);

    return new Promise( (resolve, reject) => {
      axios.delete('/wms/webmedia/livestream/viewer', {
        data: {
          viewerId: viewerId.toString(),
          streamId: streamId.toString()
        }
      })
        .then( res => {
          if(res.status === 200) {
            resolve();
          } else {
            reject(Error(`Remove Live Stream Viewer Error!\n ${res.message}`));
          }
        })
        .catch( err => {
          reject(err);
        });
    });
  }
};


export default {
  state,
  getters,
  mutations,
  actions
}
