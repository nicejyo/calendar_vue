import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main',
      component: () => import('../views/Calendar.vue'),
    },
    {
      path: '/1',
      name: '1',
      component: () => import('../views/Calendar2.vue'),
    },
  ],
})

export default router
