<style scoped>
  .layout{
    border: 1px solid #d7dde4;
    background: #f5f7f9;
    position: relative;
    border-radius: 4px;
    overflow: hidden;
  }
  .layout-breadcrumb{
    padding: 10px 15px 0;
  }
  .layout-content{
    /*min-height: 200px;*/
    margin: 15px;
    overflow: hidden;
    background: #fff;
    border-radius: 4px;
  }
  .layout-content-main{
    padding: 10px;
  }
  .layout-copy{
    text-align: center;
    padding: 10px 0 20px;
    color: #9ea7b4;
  }
  .layout-menu-left{
    background: #464c5b;
  }
  .layout-header{
    height: 60px;
    background: #fff;
    box-shadow: 0 1px 1px rgba(0,0,0,.1);
  }
  .layout-logo-left{
    width: 90%;
    height: 30px;
    background: #5b6270;
    border-radius: 3px;
    margin: 15px auto;
  }
  .layout-ceiling-main a{
    color: #9ba7b5;
  }
  .layout-hide-text .layout-text{
    display: none;
  }
  .ivu-col{
    transition: width .2s ease-in-out;
  }
  video {
    background: black;
    border: 1px solid gray;
  }
  #remoteVideo {
    width: 100%;
    /*height: 70%;*/
    object-fit: fill;
  }
</style>
<template>
  <div class="layout" :class="{'layout-hide-text': spanLeft < 5}">
    <Row type="flex">
      <Col :span="spanLeft" class="layout-menu-left">
      <Menu active-name="1" theme="dark" width="auto" :accordion=true v-on:on-select="onSelected" v-on:on-open-change="onOpenChange">
        <div class="layout-logo-left"></div>

        <template v-for="(item, index) in data">
        <Submenu :name="index">
          <template slot="title">
            <Icon type="videocamera"></Icon>
            {{item.ip}} {{item.name}}
          </template>
          <template v-for="(item, index2) in streamConfig">
            <MenuItem :name="index2">
              {{streamName[index2] + item.resolution + 'P'}}
            </MenuItem>
          </template>
        </Submenu>
        </template>

      </Menu>
      </Col>
      <Col :span="spanRight">
      <div class="layout-header">
        <Button type="text" @click="toggleClick">
          <Icon type="navicon" size="32"></Icon>
        </Button>
      </div>
      <div class="layout-breadcrumb">
        <Breadcrumb>
          <BreadcrumbItem href="/">首页</BreadcrumbItem>
          <!--<BreadcrumbItem href="/index">应用中心</BreadcrumbItem>-->
          <BreadcrumbItem>{{selectedIp}}</BreadcrumbItem>
          <BreadcrumbItem>{{selectedStream}}</BreadcrumbItem>
        </Breadcrumb>
      </div>
      <div class="layout-content">
        <div class="layout-content-main">
          <video id="remoteVideo" autoplay controls></video>
        </div>
        <div class="layout-ptz">
          <Button type="info" @click="ptzCtrl('stop')" :disabled="ptzDisabled">stop</Button>
          <Button type="primary" @click="ptzCtrl('up')" :disabled="ptzDisabled">Up</Button>
          <Button type="primary" @click="ptzCtrl('down')" :disabled="ptzDisabled">Down</Button>
          <Button type="primary" @click="ptzCtrl('left')" :disabled="ptzDisabled">Left</Button>
          <Button type="primary" @click="ptzCtrl('right')" :disabled="ptzDisabled">Right</Button>
          <Button type="primary" @click="ptzCtrl('zoomIn')" :disabled="ptzDisabled">Zoom In</Button>
          <Button type="primary" @click="ptzCtrl('zoomOut')" :disabled="ptzDisabled">Zoom Out</Button>
        </div>
      </div>
      <div class="layout-copy">
        2011-2017 &copy; Kedacom Sys
      </div>
      </Col>
    </Row>
  </div>
</template>
<script>
  import axios from 'axios'
  import { mapState } from 'vuex'
  import webStreamer from '@/libs/webStreamer/webStreamer'
  import 'webrtc-adapter'
  export default {
    data () {
      return {
        spanLeft: 5,
        spanRight: 19,
        streamName: ['主码流', '辅码流','第三码流'],
        selectedIp: null,
        selectedStream: null,
/*        webStreamerClient: null,
        endpointId: null,
        streamId: null,
        peerConnection: null,
        connectionId: null,*/
        currentStreamUri: null,
        uriStreamDataMap: new Map()
      }
    },
    beforeRouteLeave (to, from, next) {
      console.log('beforeRouteLeave');
      this.handUp(next);
    },
    mounted() {
      let self = this;
      this.remoteVideo = document.getElementById('remoteVideo');
      this.remoteVideo.addEventListener('loadedmetadata', function() {
        //self.handleEnd();
        console.log('Remote video videoWidth: ' + this.videoWidth +
          'px,  videoHeight: ' + this.videoHeight + 'px');
      });
    },
    computed: {
      iconSize () {
        return this.spanLeft === 5 ? 14 : 24;
      },
      ...mapState({
        data: state => state.deviceList.list,
        streamConfig: state => state.deviceList.streamConfig,
        streamUri: state => state.deviceList.streamUri,
        ptzDisabled: state => state.deviceList.ptzDisabled
      })
    },
    watch: {
      streamUri: function (val, oldVal) {
        console.log(`streamUri\nval: ${val}\noldVal:${oldVal}`);
        if(oldVal) {
            //release source
            this.handUp(null, oldVal);
        }
        if(val) {
            //create live stream
          this.createLiveStream(val);
        }
      }
    },
    created() {
        this.getRegisteredDeviceList();
    },
    methods: {
      request(webStreamerClient, msgObj, method, path) {
        webStreamerClient.request({
          method: method,
          path: path,
          body: JSON.stringify(msgObj)
        });
      },
      createClientServer() {
          return webStreamer.createClientServer( reqRes => {
            if(reqRes.header.request) {
              this.notificationHandler(reqRes.body);
            }
          });
      },
      notificationHandler(msg) {
        console.log('notificationHandler:\r\n' + msg);
        let data;
        try {
          data = JSON.parse(msg);
        } catch(err) {
          console.log(err.message);
          throw err;
        }
        if(data.message.status === 'connecting') {
          console.log('connecting');
          let streamData = this.uriStreamDataMap.get(this.streamUri);
          if(streamData.peerConnection) {
            this.createOffer();
          }
        }
        if(data.message.sdp !== undefined) {
          switch(data.message.sdp.type) {
            case "offer":
              this.handleOffer(data.message.sdp);
              break;
            case "answer":
              this.handleAnswer(data.message.sdp);
              break;
            default:
              break;
          }
          if(data.message.sdp.candidate) {
            this.handleCandidate(data.message.sdp);
          }
        }
      },
      createLiveStream(uri) {
        this.$Loading.start();
        this.$store.dispatch({
          type: 'createLiveStream',
          uri: uri
        }).then(streamId => {
          this.currentStreamUri = uri;
          this.uriStreamDataMap.set(uri, {
              streamId: streamId
          });
          this.addLiveStreamViewer(streamId);
        }, err => {
          // Error handle
          console.log(err.message);
          this.$Loading.error();
        })
      },
      addLiveStreamViewer(streamId) {
          let self = this;

          this.$store.dispatch({
            type: 'addLiveStreamViewer',
            streamId: streamId
          }).then( res => {
            self.$Loading.finish();
            let signalingBridge = res.signalingBridge;

            let endpointId = Date.now().toString(),
              streamData = self.uriStreamDataMap.get(self.streamUri),
              webStreamerClient = self.createClientServer();

            streamData.connectionId = res.viewerId;
            streamData.endpointId = endpointId;
            streamData.webStreamerClient = webStreamerClient;



            webStreamerClient.connect(`${signalingBridge}/endpoint${endpointId}`).on('onconnect', () => {
              console.log('signalingBridge connected!' + ',endpoint' + endpointId);
              self.handleJoin();
              self.subscribe();
            });
          }).catch( err => {
            console.log(err.message);
            this.$Loading.error();
          })
      },
      handleJoin() {
        console.log('RTCPeerConnection creating!');

        let peerConnection = new RTCPeerConnection();

        let streamData = this.uriStreamDataMap.get(this.streamUri);
        streamData.peerConnection = peerConnection;


        let self = this;

        peerConnection.ontrack = (e) => {
          console.log('ontrack');
          if (this.remoteVideo.srcObject !== e.streams[0]) {
            this.remoteVideo.srcObject = e.streams[0];
            console.log('received remote stream');
          }
        };

        // Setup ice handling
        let connectionId = this.uriStreamDataMap.get(this.streamUri).connectionId;
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            let msgObj = {
              endpoint: {
                type: 'offerer',
                connection: connectionId.toString()
              },
              message: {
                sdp: event.candidate
              }
            };
            console.log('===========send candidate===========');
            this.request(streamData.webStreamerClient, msgObj, 'PUT', '/webrtc/push');
          }
        };

        peerConnection.oniceconnectionstatechange = (event) => {
          if(peerConnection) {
            console.log('ICE state: ' + peerConnection.iceConnectionState);
            console.log('ICE state change event: ', event);
          }
        };
      },
      subscribe() {
        let streamData = this.uriStreamDataMap.get(this.streamUri),
          connectionId = streamData.connectionId,
          endpointId = streamData.endpointId,
          webStreamerClient = streamData.webStreamerClient;
        let postObj = {
          endpoint: [{
            type: 'answerer',
            connection: connectionId.toString(),
            topic: ['sdp', 'status']
          }],
          notify_addr: `endpoint${endpointId}`
        };

        this.request(webStreamerClient, postObj, 'POST', '/webrtc/subscription');
        console.log('subscribe successfully');
        postObj = {
          endpoint: {
            type: 'offerer',
            connection: connectionId.toString()
          },
          message: {
            status: 'connecting'
          }
        };
        this.request(webStreamerClient, postObj, 'PUT', '/webrtc/push');
      },
      createOffer() {
        let offerOptions = {
          offerToReceiveAudio: 0,
          offerToReceiveVideo: 1
        };
        let self = this;

        let streamData = this.uriStreamDataMap.get(this.streamUri);

        console.log('createOffer start');
        streamData.peerConnection.createOffer(
          offerOptions
        ).then(
          onCreateOfferSuccess,
          error => {
            console.log('Failed to create session description: ' + error.toString());
          }
        );

        function onCreateOfferSuccess(desc) {
          console.log('setLocalDescription start');
          //self.callBtn.disabled = true;
          streamData.peerConnection.setLocalDescription(desc).then(
            function() {
              console.log('setLocalDescription complete\n');
              console.log('offer sdp: ' + desc.sdp);
              let connectionId = streamData.connectionId;
              let msgObj = {
                endpoint: {
                  type: 'offerer',
                  connection: connectionId.toString()
                },
                message: {
                  sdp: desc
                }
              };
              self.request(streamData.webStreamerClient, msgObj, 'PUT', '/webrtc/push');
            },
            error => {
              console.log('Failed to set session description: ' + error.toString());
            }
          );
        }
      },
      handleOffer(offer) {
        console.log('handleOffer:');
        let self = this;
        console.log('setRemoteDescription start');
        let streamData = this.uriStreamDataMap.get(this.streamUri);

        streamData.peerConnection.setRemoteDescription(offer).then(
          () => {
            console.log('setRemoteDescription complete');
            console.log('createAnswer start');
            streamData.peerConnection.createAnswer().then(
              onCreateAnswerSuccess,
              () => {
                console.log('Failed to create session description: ' + error.toString());
              }
            );
          },
          error => {
            console.log('Failed to set session description: ' + error.toString());
          }
        );

        function onCreateAnswerSuccess(answer) {
          streamData.peerConnection.setLocalDescription(answer);
          console.log('answer sdp: ' + answer.sdp);
          let connectionId = streamData.connectionId;
          let msgObj = {
            endpoint: {
              type: 'offerer',
              connection: connectionId.toString()
            },
            message: {
              sdp: answer,
              status: 'connected'
            }
          };
          self.request(streamData.webStreamerClient, msgObj, 'PUT', '/webrtc/push');
        }
      },
      //when we got an answer from a remote user
      handleAnswer(answer) {
        console.log('handleAnswer:');

        let streamData = this.uriStreamDataMap.get(this.streamUri);

        streamData.peerConnection.setRemoteDescription(answer);

        let connectionId = streamData.connectionId;
        let msgObj = {
          endpoint: {
            type: 'offerer',
            connection: connectionId.toString()
          },
          message: {
            status: 'connected'
          }
        };
        this.request(streamData.webStreamerClient, msgObj, 'PUT', '/webrtc/push');
      },
      //when we got an ice candidate from a remote user
      handleCandidate(candidate) {
        console.log('handleCandidate:');
        let streamData = this.uriStreamDataMap.get(this.streamUri);

        streamData.peerConnection.addIceCandidate(candidate).catch(e => console.log(e));
      },
      handUp(next, oldVal) {
        let streamData = this.uriStreamDataMap.get(oldVal);
        if(!streamData) {
          if(next && typeof next === 'function') {
            next();
            return;
          } else {
            return;
          }
        }
        let postObj = {
          endpoint: [{
            type: 'answerer',
            connection: streamData.connectionId.toString(),
            topic: ['sdp', 'status']
          }],
          notify_addr: `endpoint${streamData.endpointId}`
        };

        this.request(streamData.webStreamerClient, postObj, 'DELETE', '/webrtc/subscription');

        document.querySelector('#remoteVideo').srcObject = null;

        if(streamData.peerConnection) {
          console.log('\n============delete PeerConnection============\n');
          streamData.peerConnection.close();
          streamData.peerConnection = null;
        }
        if(streamData.webStreamerClient) {
          console.log('\n============delete webStreamerClient============\n');
          streamData.webStreamerClient.close();
        }
        this.uriStreamDataMap.delete(oldVal);

        this.$store.dispatch({
          type: 'removeLiveStreamViewer',
          streamId: streamData.streamId,
          viewerId: streamData.connectionId
        }).then(res => {
        }, err => {
          // Error handle
          console.log(err.message);
        });

        if(next && typeof next === 'function') {
          next();
        }
      },
      onSelected (index) {
        console.log(`itemSelected: ${index}`);
        if(this.selectedStream === this.streamName[index]) {
            return;
        }
        this.selectedStream = this.streamName[index];
        this.getStreamUri(this.selectedIp, this.streamConfig[index].profileToken);
      },
      onOpenChange(index ) {
        let indexNum = Number.parseInt(index);

        if(!Number.isNaN(indexNum)) {
          if(this.selectedIp === this.data[indexNum].ip) {
              return;
          }
          this.selectedIp = this.data[indexNum].ip;
          this.selectedStream = null;
          this.$store.commit({
            type: 'updateData',
            name: 'streamConfig',
            value: null
          });
          this.getStreamConfig(this.selectedIp);
        }
      },
      toggleClick () {
        if (this.spanLeft === 5) {
          this.spanLeft = 2;
          this.spanRight = 22;
        } else {
          this.spanLeft = 5;
          this.spanRight = 19;
        }
      },
      getRegisteredDeviceList () {
        this.$Loading.start();
        this.$store.dispatch({
          type: 'getDeviceList'
        }).then(res => {
          this.$Loading.finish();
        }, err => {
          // Error handle
          console.log(err.message);
          this.$Loading.error();
        })
      },
      getStreamConfig (ip) {
        this.$Loading.start();
        this.$store.dispatch({
          type: 'getStreamConfig',
          ip: ip
        }).then(res => {
          this.$Loading.finish();
        }, err => {
          // Error handle
          console.log(err.message);
          this.$Loading.error();
        })
      },
      getStreamUri (ip, profileToken) {
        this.$Loading.start();
        this.$store.dispatch({
          type: 'getStreamUri',
          ip: ip,
          profileToken: profileToken
        }).then(res => {
          this.$Loading.finish();
        }, err => {
          // Error handle
          console.log(err.message);
          this.$Loading.error();
        })
      },
      ptzCtrl (direction) {
        console.log('direction: ');
        console.log(direction);
        this.$store.dispatch({
          type: 'devicePtzCtrl',
          direction: direction,
          ip: this.selectedIp
        });
      }
    }
  }
</script>
