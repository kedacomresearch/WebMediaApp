import Vue from 'vue'
import Router from 'vue-router'
import Util from '../libs/util';
import Routers from './router';
import iView from 'iview';
import 'iview/dist/styles/iview.css';

Vue.use(Router);
Vue.use(iView);

// 路由配置
const RouterConfig = {
  mode: 'history',
  routes: Routers
};
const router = new Router(RouterConfig);

router.beforeEach((to, from, next) => {
  iView.LoadingBar.start();
  Util.title(to.meta.title);
  next();
});

router.afterEach((to, from, next) => {
  iView.LoadingBar.finish();
  window.scrollTo(0, 0);
});

export default router
