import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const websites = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return Promise.all(
      websites.map(async (website) => {
        const articlesCount = await ctx.db
          .query("articles")
          .withIndex("by_website", (q) => q.eq("websiteId", website._id))
          .collect()
          .then((articles) => articles.length);

        return {
          ...website,
          articlesCount,
        };
      })
    );
  },
});

export const add = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to add websites");
    }

    // Check if URL already exists for this user
    const existing = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("url"), args.url))
      .first();

    if (existing) {
      throw new Error("Website already exists in your feeds");
    }

    const websiteId = await ctx.db.insert("websites", {
      url: args.url,
      title: args.title,
      description: args.description,
      userId,
      isActive: true,
    });

    // Create RSS feed entry
    const feedId = `feed_${websiteId}`;
    await ctx.db.insert("rssFeeds", {
      websiteId,
      feedId,
      title: args.title,
      description: args.description || `RSS feed for ${args.title}`,
      link: args.url,
      lastBuildDate: Date.now(),
    });

    return websiteId;
  },
});

export const remove = mutation({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== userId) {
      throw new Error("Website not found or access denied");
    }

    // Delete all articles for this website
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .collect();

    for (const article of articles) {
      await ctx.db.delete(article._id);
    }

    // Delete RSS feed
    const rssFeeds = await ctx.db
      .query("rssFeeds")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .collect();

    for (const feed of rssFeeds) {
      await ctx.db.delete(feed._id);
    }

    // Delete website
    await ctx.db.delete(args.websiteId);
  },
});

export const toggle = mutation({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== userId) {
      throw new Error("Website not found or access denied");
    }

    await ctx.db.patch(args.websiteId, {
      isActive: !website.isActive,
    });
  },
});

export const update = mutation({
  args: {
    websiteId: v.id("websites"),
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== userId) {
      throw new Error("Website not found or access denied");
    }

    const existing = await ctx.db
      .query("websites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("url"), args.url))
      .first();

    if (existing && existing._id !== args.websiteId) {
      throw new Error("Website already exists in your feeds");
    }

    await ctx.db.patch(args.websiteId, {
      url: args.url,
      title: args.title,
      description: args.description,
    });

    const rssFeeds = await ctx.db
      .query("rssFeeds")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .collect();

    for (const feed of rssFeeds) {
      await ctx.db.patch(feed._id, {
        title: args.title,
        description: args.description || `RSS feed for ${args.title}`,
        link: args.url,
        lastBuildDate: Date.now(),
      });
    }
  },
});

export const getArticles = query({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const website = await ctx.db.get(args.websiteId);
    if (!website || website.userId !== userId) {
      return [];
    }

    return await ctx.db
      .query("articles")
      .withIndex("by_website_and_date", (q) => q.eq("websiteId", args.websiteId))
      .order("desc")
      .take(50);
  },
});
