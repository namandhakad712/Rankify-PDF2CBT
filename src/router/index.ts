import { createRouter, createWebHistory } from "vue-router"

const Home = () => import("@/pages/Home.vue")
const Extract = () => import("@/pages/Extract.vue")
const Review = () => import("@/pages/Review.vue")
const Test = () => import("@/pages/Test.vue")
const Results = () => import("@/pages/Results.vue")
const About = () => import("@/pages/About.vue")
const GettingStarted = () => import("@/pages/GettingStarted.vue")
const Privacy = () => import("@/pages/Privacy.vue")

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/extract", name: "extract", component: Extract, alias: ["/ai-extractor"] },
    { path: "/review", name: "review", component: Review, alias: ["/review-interface"] },
    { path: "/cbt/test", redirect: "/test" },
    { path: "/cbt/interface", redirect: "/extract" },
    { path: "/test", name: "test", component: Test },
    { path: "/results", name: "results", component: Results, alias: ["/cbt/results"] },
    { path: "/about", name: "about", component: About },
    { path: "/getting-started", name: "getting-started", component: GettingStarted },
    { path: "/privacy", name: "privacy", component: Privacy },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  // Guard review/test need data in localStorage/IDB — light check, allow but warn
  if ((to.name === "review" || to.name === "test") && typeof window !== "undefined") {
    const hasReview = !!localStorage.getItem("rpdf2cbt-review")
    const hasCurrent = !!localStorage.getItem("rpdf2cbt-current")
    if (to.name === "review" && !hasReview) {
      // allow, page will show empty state with CTA to /extract
    }
    if (to.name === "test" && !hasCurrent) {
      // allow similarly
    }
  }
  return true
})
