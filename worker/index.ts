import handler from "vinext/server/fetch-handler";

export default {
  fetch: handler.fetch,
  async scheduled(_controller, _env, ctx) {
    const { runDailyJobs } = await import("../lib/jobs");
    ctx.waitUntil(runDailyJobs());
  },
} satisfies ExportedHandler;
