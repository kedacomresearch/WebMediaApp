<style scoped lang="less">
    .index{
        width: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        text-align: center;
        h1{
          color: #666;
        }
        h2{
            color: #666;
            margin-bottom: 20px;
            p{
                margin: 0 0 50px;
            }
        }
        .ivu-row-flex{
            height: 100%;
        }
    }

    body {
      background: #eee;
      padding: 5% 0;
    }

    video {
      background: black;
      border: 1px solid gray;
    }

    #remoteVideo {
      width: 70%;
      /*height: 70%;*/
      object-fit: fill;
    }

    .demo-spin-icon-load{
      animation: ani-demo-spin 1s linear infinite;
    }
</style>
<template>
    <div class="index">
        <Row type="flex" justify="center" align="middle">
            <Col span="24">
                <h1>
                  IPC实时浏览
                </h1>
          <video id="remoteVideo" autoplay controls></video>
                <h2>
                    <!--<p>Welcome to your iView app!</p>-->
                  <Button type="info" @click="ptzCtrl('stop')" :disabled="ptzDisabled">stop</Button>
                  <Button type="primary" @click="ptzCtrl('up')" :disabled="ptzDisabled">Up</Button>
                  <Button type="primary" @click="ptzCtrl('down')" :disabled="ptzDisabled">Down</Button>
                  <Button type="primary" @click="ptzCtrl('left')" :disabled="ptzDisabled">Left</Button>
                  <Button type="primary" @click="ptzCtrl('right')" :disabled="ptzDisabled">Right</Button>
                  <Button type="primary" @click="ptzCtrl('zoomIn')" :disabled="ptzDisabled">Zoom In</Button>
                  <Button type="primary" @click="ptzCtrl('zoomOut')" :disabled="ptzDisabled">Zoom Out</Button>
                </h2>
            </Col>
        </Row>
    </div>
</template>
<script>
  import { mapState } from 'vuex'
  import axios from 'axios'
  import webStreamer from '@/libs/webStreamer/webStreamer'
  import 'webrtc-adapter'
  export default {
    data () {
      return {
        device: null,
        endpoint_id: null,
        webStreamerClient: null,
        peer_connection: null,
        remoteVideo: null,
        connectionId: null,
        streamId: null
//        ptzDisabled: true
      }
    },
    mounted() {
      let self = this;
      this.remoteVideo = document.getElementById('remoteVideo');
      this.remoteVideo.addEventListener('loadedmetadata', function() {
        self.handleEnd();
        console.log('Remote video videoWidth: ' + this.videoWidth +
          'px,  videoHeight: ' + this.videoHeight + 'px');
      });
    },
    beforeRouteLeave (to, from, next) {
      console.log('beforeRouteLeave', 'single');
      this.handUp(next);
    },
    created() {
      if (this.$store.getters.deviceList.length > 0 && this.$store.getters.indexSelected >= 0) {
        this.device = this.$store.getters.deviceList[this.$store.getters.indexSelected];
        this.endpoint_id = Math.floor(Math.random()*10000);
        this.$Loading.start();
        axios.get(`/PWVMS/media/streamuri?ip=${this.device.ip}`)
          .then( res => {
            let uri = res.data.uri;
            this.$Loading.finish();
            console.log(uri);
            //this.handleStart();
            this.createLiveStream(uri);
          })
          .catch( err => {
            console.log(err.message);
            this.$Loading.error();
          });
      } else {
        this.$Message.info('请返回重新获取设备信息');
      }
    },
    computed: {
      ...mapState({
        index: state => state.deviceList.indexSelected,
        ipList: state => state.deviceList.list,
        ptzDisabled: state => state.deviceList.ptzDisabled
      })
    },
    methods: {
      request(msgObj, method, path) {
        this.webStreamerClient.request({
          method: method,
          path: path,
          body: JSON.stringify(msgObj)
        });
      },
      handleStart () {
        this.$Spin.show({
          render: (h) => {
            return h('div', [
              h('Icon', {
                'class': 'demo-spin-icon-load',
                props: {
                  type: 'load-c',
                  size: 18
                }
              }),
              h('div', 'Loading')
            ])
          }
        });
      },
      handleEnd() {
        this.$Spin.hide();
      },
      async createLiveStream(uri) {
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
          let res = await axios.post('/webmedia/livestream', bodyObj);
          if(res.status === 200) {
              this.streamId = res.data.streamId;
              this.addLiveStreamViewer(res.data.streamId);
          }
      },
      async addLiveStreamViewer(streamId) {
          let obj = {
            type: 'webrtc',
            Id: streamId.toString(),
            video: 'recvonly',
            audio: 'recvonly',
          };
          let res = await axios.post(`/webmedia/livestream/viewer`, obj);
          if(res.status === 200) {
            this.connectionId = res.data.viewerId;
            this.createClientServer(res.data.viewerId, res.data.signalingBridge);
          }
      },
      createClientServer (viewerId, signalingBridge) {
        console.log('createClientServer: ', viewerId, '  ', signalingBridge);
        this.webStreamerClient = webStreamer.createClientServer( reqRes => {
          if(reqRes.header.request) {
            this.notificationHandler(reqRes.body);
          } else {

          }
        }).connect(`${signalingBridge}/endpoint${this.endpoint_id}`).on('onconnect', () => {
          console.log('signalingBridge connected!' + ',endpoint' + this.endpoint_id);
          this.handleJoin();
          this.subscribe();
        });
      },
      subscribe() {
        let postObj = {
          endpoint: [{
            type: 'answerer',
            connection: this.connectionId.toString(),
            topic: ['sdp', 'status']
          }],
          notify_addr: `endpoint${this.endpoint_id}`
        };
        let self = this;

        this.request(postObj, 'POST', '/webrtc/subscription');
        console.log('subscribe successfully');
        postObj = {
          endpoint: {
            type: 'offerer',
            connection: self.connectionId.toString()
          },
          message: {
            status: 'connecting'
          }
        };
        this.request(postObj, 'PUT', '/webrtc/push');
      },
      handleJoin() {
        console.log('RTCPeerConnection created');

        this.peer_connection = new RTCPeerConnection();


        let self = this;
        //setup stream listening
//                    this.peer_connection.addStream(myStream);

        /*                    let tracksNum = this.localStream.getTracks().length;
         trace('trackNum: ' + tracksNum);
         for(let i = 0; i < tracksNum; ++i) {
         this.peer_connection.addTrack( this.localStream.getTracks()[i], this.localStream);
         }*/
        /*                    this.localStream.getTracks().forEach(
         function(track) {
         self.peer_connection.addTrack(
         track,
         self.localStream
         );
         });*/

        //when a remote user adds a stream to the peer connection, we display it
        /*                                    this.peer_connection.onaddstream = (e) => {
         trace('onaddstream');
         console.log(e);
         document.querySelector('#remoteVideo').srcObject = e.stream;
         };*/
        this.peer_connection.ontrack = (e) => {
          console.log('ontrack');
          this.$store.dispatch({
            type: 'getDevicePtzNodes'
          });
          if (self.remoteVideo.srcObject !== e.streams[0]) {
            self.remoteVideo.srcObject = e.streams[0];
            console.log('received remote stream');
          }
        };

        // Setup ice handling
        this.peer_connection.onicecandidate = function (event) {
          if (event.candidate) {
            let msgObj = {
              endpoint: {
                type: 'offerer',
                connection: self.connectionId.toString()
              },
              message: {
                sdp: event.candidate
              }
            };
            console.log('===========send candidate===========');
            self.request(msgObj, 'PUT', '/webrtc/push');
          }
        };

        this.peer_connection.oniceconnectionstatechange = function (event) {
          if(this.peer_connection) {
            console.log('ICE state: ' + this.peer_connection.iceConnectionState);
            console.log('ICE state change event: ', event);
          }
        }.bind(this);
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
          if(this.peer_connection) {
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
      createOffer() {
        let offerOptions = {
          offerToReceiveAudio: 0,
          offerToReceiveVideo: 1
        };
        let self = this;

        console.log('createOffer start');
        this.peer_connection.createOffer(
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
          self.peer_connection.setLocalDescription(desc).then(
            function() {
              console.log('setLocalDescription complete\n');
              console.log('offer sdp: ' + desc.sdp);

              let msgObj = {
                endpoint: {
                  type: 'offerer',
                  connection: self.connectionId.toString()
                },
                message: {
                  sdp: desc
                }
              };
              self.request(msgObj, 'PUT', '/webrtc/push');
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
        self.peer_connection.setRemoteDescription(offer).then(
          () => {
            console.log('setRemoteDescription complete');
            console.log('createAnswer start');
            self.peer_connection.createAnswer().then(
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
          self.peer_connection.setLocalDescription(answer);
          console.log('answer sdp: ' + answer.sdp);
          let msgObj = {
            endpoint: {
              type: 'offerer',
              connection: self.connectionId.toString()
            },
            message: {
              sdp: answer,
              status: 'connected'
            }
          };
          self.request(msgObj, 'PUT', '/webrtc/push');
        }
      },
      //when we got an answer from a remote user
      handleAnswer(answer) {
        console.log('handleAnswer:');
        this.peer_connection.setRemoteDescription(answer);

        let msgObj = {
          endpoint: {
            type: 'offerer',
            connection: this.connectionId.toString()
          },
          message: {
            status: 'connected'
          }
        };
        this.request(msgObj, 'PUT', '/webrtc/push');
      },
      //when we got an ice candidate from a remote user
      handleCandidate(candidate) {
        console.log('handleCandidate:');
        this.peer_connection.addIceCandidate(candidate).catch(e => console.log(e));
      },
      handUp(next) {
        if(this.peer_connection === null) {
          if(next && typeof next === 'function') {
            next();
          }
          return;
        }
        let postObj = {
          endpoint: [{
            type: 'answerer',
            connection: this.connectionId.toString(),
            topic: ['sdp', 'status']
          }],
          notify_addr: `endpoint${this.endpoint_id}`
        };

        this.request(postObj, 'DELETE', '/webrtc/subscription');
        this.handleLeave(next);
      },
      handleLeave(next) {
        document.querySelector('#remoteVideo').srcObject = null;

        axios.delete(`/webmedia/livestream/viewer`, {
          data: {
            viewerId: this.connectionId.toString(),
            streamId: this.streamId.toString()
          }
        })
          .catch(err => {
            console.log(err.message);
          });

        if(this.peer_connection) {
          this.peer_connection.close();
          this.peer_connection = null;
        }
        if(next && typeof next === 'function') {
          next();
        }
      },
      ptzCtrl (direction) {
          console.log('direction: ');
          console.log(direction);
          this.$store.dispatch({
            type: 'devicePtzCtrl',
            direction: direction
          });
      }
    }
  }
</script>
