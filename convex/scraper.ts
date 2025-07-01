import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

export const scrapeWebsite = action({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    const website = await ctx.runQuery(internal.scraper.getWebsiteInternal, {
      websiteId: args.websiteId,
    });

    if (!website) {
      throw new Error("Website not found");
    }

    try {
      const response = await fetch(website.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RSS-Generator/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Parse HTML and extract articles
      const articles = await parseArticles(html, website);

      // Save new articles
      for (const article of articles) {
        await ctx.runMutation(internal.scraper.saveArticle, {
          websiteId: args.websiteId,
          ...article,
        });
      }

      // Update last checked time
      await ctx.runMutation(internal.scraper.updateLastChecked, {
        websiteId: args.websiteId,
      });

      return { success: true, articlesFound: articles.length };
    } catch (error) {
      console.error(`Error scraping ${website.url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
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

// Simple HTML parsing function (in a real app, you'd use a proper HTML parser)
async function parseArticles(html: string, website: any) {
  const articles = [];

  // Basic regex patterns for common article structures
  const titlePattern = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;

  let match;
  let articleIndex = 0;

  // Collect all links in the HTML for later lookup
  const links: { href: string; text: string; index: number }[] = [];
  while ((match = linkPattern.exec(html)) !== null) {
    links.push({ href: match[1], text: match[2], index: match.index });
  }

  // Extract titles and create basic articles
  while ((match = titlePattern.exec(html)) !== null && articleIndex < 20) {
    const title = match[1].replace(/<[^>]*>/g, "").trim();
    const titleIndex = match.index;

    if (title.length > 10) {
      // Filter out very short titles
      // Find the closest link after the title in the HTML
      let articleLink = website.url;
      let minDistance = Infinity;
      for (const link of links) {
        const distance = Math.abs(link.index - titleIndex);
        if (distance < minDistance && link.text && title.includes(link.text)) {
          articleLink = link.href;
          minDistance = distance;
        }
      }
      // If no link text matches, just use the first link after the title
      if (articleLink === website.url) {
        for (const link of links) {
          if (link.index > titleIndex) {
            articleLink = link.href;
            break;
          }
        }
      }
      // If the link is relative, resolve it against the website URL
      if (articleLink && !/^https?:\/\//i.test(articleLink)) {
        try {
          articleLink = new URL(articleLink, website.url).href;
        } catch {
          // Ignore URL resolution errors and keep the original articleLink
        }
      }
      const guid = `${website.url}_${title.replace(/\W/g, "_")}_${Date.now()}`;

      articles.push({
        title,
        link: articleLink,
        description: title,
        pubDate: Date.now() - articleIndex * 60000, // Stagger dates
        guid,
      });

      articleIndex++;
    }
  }

  return articles;
}
