import { createRouter, createWebHistory } from 'vue-router'
import CalendarView from "../views/CalendarView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:id',
      name: 'calendar',
      component: CalendarView
    }
  ]
})

export default router
