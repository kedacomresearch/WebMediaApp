import DeviceList from '@/components/DeviceList'

const routers = [
  {
    path: '/',
    name: 'Hello',
    meta: {
      title: 'IPC设备列表'
    },
    component: (resolve) => require(['../components/DeviceList.vue'], resolve)
    //component: DeviceList
  },
  {
    path: '/video',
    name: 'VideoWatch',
    meta: {
      title: 'IPC查看'
    },
    component: (resolve) => require(['../components/VideoWatch.vue'], resolve)
  }
];

export default routers;
