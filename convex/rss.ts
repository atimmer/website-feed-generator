import { v } from "convex/values";
import { query } from "./_generated/server";

export const getFeed = query({
  args: { feedId: v.string() },
  handler: async (ctx, args) => {
    const feed = await ctx.db
      .query("rssFeeds")
      .withIndex("by_feed_id", (q) => q.eq("feedId", args.feedId))
      .first();

    if (!feed) {
      return null;
    }

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_website_and_date", (q) =>
        q.eq("websiteId", feed.websiteId)
      )
      .order("desc")
      .take(50);

    return {
      feed,
      articles,
    };
  },
});

export const generateRSSXML = query({
  args: { feedId: v.string() },
  handler: async (ctx, args) => {
    const feedData = await ctx.db
      .query("rssFeeds")
      .withIndex("by_feed_id", (q) => q.eq("feedId", args.feedId))
      .first();

    if (!feedData) {
      return null;
    }

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_website_and_date", (q) =>
        q.eq("websiteId", feedData.websiteId)
      )
      .order("desc")
      .take(50);

    const rssXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXML(feedData.title)}</title>
    <description>${escapeXML(feedData.description)}</description>
    <link>${escapeXML(feedData.link)}</link>
    <lastBuildDate>${new Date(feedData.lastBuildDate).toUTCString()}</lastBuildDate>
    <generator>Custom RSS Generator</generator>
    ${articles
      .map(
        (article) => `
    <item>
      <title>${escapeXML(article.title)}</title>
      <link>${escapeXML(article.link)}</link>
      <description>${escapeXML(article.description || "")}</description>
      <pubDate>${new Date(article.pubDate).toUTCString()}</pubDate>
      <guid>${escapeXML(article.guid)}</guid>
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

    return rssXML;
  },
});

export const getSiteUrl = query({
  args: {},
  handler: async () => {
    return process.env.CONVEX_SITE_URL;
  },
});

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
