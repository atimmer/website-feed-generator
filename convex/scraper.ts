import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

// Import OpenAI SDK
import OpenAI from "openai";

export const scrapeWebsite = action({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    // Get website info
    const website = await ctx.runQuery(internal.scraper.getWebsiteInternal, {
      websiteId: args.websiteId,
    });
    if (!website) throw new Error("Website not found");

    // Fetch HTML
    const response = await fetch(website.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS-Generator/2.0)",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();

    // Prepare LLM prompt
    const prompt = `You are an expert web scraper. Given the following HTML from a website, extract up to 20 recent articles as JSON objects with the following fields: title (string), link (string, absolute URL), description (string, optional), pubDate (number, ms since epoch), guid (string, unique per article). Use the website URL as context: ${website.url}. Return a JSON array. If you can't find articles, return an empty array.\n\nHTML:\n${html}`;

    // Use OpenRouter via OpenAI SDK
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "X-Title": "Website Feed Generator",
      },
    });

    // Call LLM
    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    let articles: any[] = [];
    try {
      // Try to parse the LLM's response as JSON
      const content = completion.choices[0].message.content;
      if (typeof content !== "string") {
        throw new Error("LLM response content is null or not a string");
      }
      articles = JSON.parse(content);
      if (!Array.isArray(articles)) throw new Error("Not an array");
    } catch (e) {
      throw new Error(
        "Failed to parse LLM response as JSON: " +
          (e instanceof Error ? e.message : String(e))
      );
    }

    const crawlTimestamp = Date.now();
    const validArticles = articles
      .filter(
        (article) =>
          typeof article?.title === "string" &&
          typeof article?.link === "string" &&
          typeof article?.guid === "string"
      )
      .map((article) => ({
        title: article.title,
        link: article.link,
        description:
          typeof article.description === "string"
            ? article.description
            : undefined,
        pubDate:
          typeof article.pubDate === "number" ? article.pubDate : crawlTimestamp,
        guid: article.guid,
      }));

    // Save new articles
    let savedCount = 0;
    for (const article of validArticles) {
      await ctx.runMutation(internal.scraper.saveArticle, {
        websiteId: args.websiteId,
        title: article.title,
        link: article.link,
        description: article.description,
        pubDate: article.pubDate,
        guid: article.guid,
      });
      savedCount++;
    }

    // Update last checked time
    await ctx.runMutation(internal.scraper.updateLastChecked, {
      websiteId: args.websiteId,
    });

    return {
      success: true,
      articlesFound: savedCount,
      articles: validArticles,
      scrapedAt: crawlTimestamp,
    };
  },
});

export const getWebsiteInternal = internalQuery({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.websiteId);
  },
});

export const saveArticle = internalMutation({
  args: {
    websiteId: v.id("websites"),
    title: v.string(),
    link: v.string(),
    description: v.optional(v.string()),
    pubDate: v.number(),
    guid: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if article already exists
    const existing = await ctx.db
      .query("articles")
      .withIndex("by_guid", (q) => q.eq("guid", args.guid))
      .first();
    if (!existing) {
      await ctx.db.insert("articles", {
        websiteId: args.websiteId,
        title: args.title,
        link: args.link,
        description: args.description,
        pubDate: args.pubDate,
        guid: args.guid,
      });
    } else {
      await ctx.db.patch(existing._id, {
        websiteId: args.websiteId,
        title: args.title,
        link: args.link,
        description: args.description,
        pubDate: args.pubDate,
        guid: args.guid,
      });
    }
  },
});

export const updateLastChecked = internalMutation({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.websiteId, {
      lastChecked: Date.now(),
    });
  },
});
