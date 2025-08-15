import { nextTick } from 'vue';
import { createRouter, createWebHistory, type RouteLocation } from 'vue-router';
import Home from './pages/Home.vue'
import ClassicMapSizesPage from './pages/ClassicMapSizesPage.vue'
import ContestMapSizesPage from './pages/ContestMapSizesPage.vue'
import ListPictures from './pages/ListPictures.vue'
import HowToPlay from './pages/HowToPlay.vue'
import ClassicMode from './pages/mode/ClassicMode.vue'
import ContestGenerator from './pages/ContestGenerator.vue'
import ImageMode from './pages/mode/ImageMode.vue'
import ContestMode from './pages/mode/ContestMode.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/how-to-play', component: HowToPlay, name: 'how-to-play' },
    { path: '/classic-maps', component: ClassicMapSizesPage, name: 'map-sizes' },
    { path: '/contest-maps', component: ContestMapSizesPage, name: 'contest-map-sizes' },
    { path: '/pictures', component: ListPictures, name: 'pictures' },
    { path: '/contest', component: ContestGenerator, name: 'contest-generator' },
    { path: '/contest/play/:pin', component: ContestMode, props: true, name: 'contest-play' },
    { path: '/contest/:mapSize', component: ContestGenerator, props: true, name: 'contest-generator-custom' },
    { path: '/i/:imageName', component: ImageMode, props: true, name: 'image-mode' },
    { path: '/mode/image/:imageName', redirect: (to: RouteLocation) => ({ path: `/i/${to.params.imageName}` }) },
    { path: '/classic', component: ClassicMode, name: 'classic-mode' },
    { path: '/c/:mapSize', component: ClassicMode, props: true, name: 'classic-mode-custom' },
    { path: '/:mapSize', redirect: (to: RouteLocation) => ({ path: `/c/${to.params.mapSize}` }) },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
});

router.afterEach((to, from) => {
    nextTick(() => {
        document.body.tabIndex = 0;
        document.body.focus();
        document.body.tabIndex = -1;
    });
});

export default router;
