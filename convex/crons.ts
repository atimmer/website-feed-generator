import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";

const crons = cronJobs();

// Run daily at 6 AM UTC
crons.cron("daily website scraping", "0 6 * * *", internal.crons.scrapeAllWebsites, {});

export const scrapeAllWebsites = internalAction({
  args: {},
  handler: async (ctx) => {
    const websites = await ctx.runQuery(internal.crons.getActiveWebsites, {});
    
    console.log(`Starting daily scrape for ${websites.length} websites`);
    
    for (const website of websites) {
      try {
        const result = await ctx.runAction(api.scraper.scrapeWebsite, {
          websiteId: website._id,
        });
        console.log(`Scraped ${website.url}: ${result.success ? 'success' : 'failed'}`);
      } catch (error) {
        console.error(`Error scraping ${website.url}:`, error);
      }
    }
    
    console.log("Daily scraping completed");
  },
});

export const getActiveWebsites = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("websites")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export default crons;
