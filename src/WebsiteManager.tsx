import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { AddWebsiteForm } from "./AddWebsiteForm";
import { WebsiteList } from "./WebsiteList";

export function WebsiteManager() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [crawlResults, setCrawlResults] = useState<
    Record<
      string,
      {
        scrapedAt: number;
        articles: {
          title: string;
          link: string;
          description?: string;
          pubDate: number;
          guid: string;
        }[];
      }
    >
  >({});
  const websites = useQuery(api.websites.list) || [];
  const scrapeWebsite = useAction(api.scraper.scrapeWebsite);

  const handleScrapeNow = async (websiteId: string) => {
    try {
      const scrapePromise = scrapeWebsite({
        websiteId: websiteId as Id<"websites">,
      });
      toast.promise(
        scrapePromise,
        {
          loading: "Scraping website...",
          success: (result) => {
            if (result.success) {
              return `Detected ${result.articlesFound} articles in this run`;
            } else {
              throw new Error(result.error);
            }
          },
          error: (error) => `Failed to scrape: ${error.message}`,
        }
      );
      const result = await scrapePromise;
      if (result.success) {
        setCrawlResults((prev) => ({
          ...prev,
          [websiteId]: {
            scrapedAt: result.scrapedAt ?? Date.now(),
            articles: result.articles ?? [],
          },
        }));
      }
    } catch (error) {
      console.error("Scraping error:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your RSS Feeds</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? "Cancel" : "Add Website"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <AddWebsiteForm onSuccess={() => setShowAddForm(false)} />
        </div>
      )}

      {websites.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No websites added yet</h3>
          <p className="text-gray-600 mb-4">
            Add your first website to start generating RSS feeds
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Website
          </button>
        </div>
      ) : (
        <WebsiteList
          websites={websites}
          onScrapeNow={handleScrapeNow}
          crawlResults={crawlResults}
        />
      )}
    </div>
  );
}
