import { createRouter, publicQuery } from "./middleware.js";
import { projectsRouter, settingsRouter } from "./routers/projects.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  projects: projectsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
