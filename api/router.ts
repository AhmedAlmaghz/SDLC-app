import { createRouter, publicQuery } from "./middleware";
import { projectsRouter, settingsRouter } from "./routers/projects";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  projects: projectsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
