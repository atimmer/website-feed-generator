import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/rss/:feedId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const feedId = url.pathname.split('/').pop();
    
    if (!feedId) {
      return new Response("Feed ID required", { status: 400 });
    }

    const rssXML = await ctx.runQuery(api.rss.generateRSSXML, { feedId });
    
    if (!rssXML) {
      return new Response("Feed not found", { status: 404 });
    }

    return new Response(rssXML, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  }),
});

export default http;
