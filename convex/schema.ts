import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  websites: defineTable({
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    lastChecked: v.optional(v.number()),
    isActive: v.boolean(),
    selector: v.optional(v.string()), // CSS selector for articles
    titleSelector: v.optional(v.string()),
    linkSelector: v.optional(v.string()),
    dateSelector: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"])
    .index("by_last_checked", ["lastChecked"]),

  articles: defineTable({
    websiteId: v.id("websites"),
    title: v.string(),
    link: v.string(),
    description: v.optional(v.string()),
    pubDate: v.number(),
    guid: v.string(), // unique identifier for the article
  })
    .index("by_website", ["websiteId"])
    .index("by_website_and_date", ["websiteId", "pubDate"])
    .index("by_guid", ["guid"]),

  rssFeeds: defineTable({
    websiteId: v.id("websites"),
    feedId: v.string(), // unique feed identifier
    title: v.string(),
    description: v.string(),
    link: v.string(),
    lastBuildDate: v.number(),
  })
    .index("by_website", ["websiteId"])
    .index("by_feed_id", ["feedId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
