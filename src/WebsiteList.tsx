import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import { EditWebsiteForm } from "./EditWebsiteForm";

interface Website {
  _id: Id<"websites">;
  url: string;
  title: string;
  description?: string;
  customInstructions?: string;
  isActive: boolean;
  lastChecked?: number;
  articlesCount: number;
}

interface WebsiteListProps {
  websites: Website[];
  onScrapeNow: (websiteId: string) => void;
  crawlResults: Record<
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
  >;
}

export function WebsiteList({
  websites,
  onScrapeNow,
  crawlResults,
}: WebsiteListProps) {
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(null);
  const [editingWebsite, setEditingWebsite] = useState<string | null>(null);
  const removeWebsite = useMutation(api.websites.remove);
  const toggleWebsite = useMutation(api.websites.toggle);
  const articles = useQuery(
    api.websites.getArticles,
    selectedWebsite ? { websiteId: selectedWebsite as Id<"websites"> } : "skip"
  );
  const siteUrl = useQuery(api.rss.getSiteUrl);

  const handleRemove = async (websiteId: string, title: string) => {
    if (
      confirm(
        `Are you sure you want to remove "${title}"? This will delete all associated articles.`
      )
    ) {
      try {
        await removeWebsite({ websiteId: websiteId as Id<"websites"> });
        toast.success("Website removed successfully");
        if (selectedWebsite === websiteId) {
          setSelectedWebsite(null);
        }
      } catch (error) {
        toast.error("Failed to remove website");
      }
    }
  };

  const handleToggle = async (websiteId: string) => {
    try {
      await toggleWebsite({ websiteId: websiteId as Id<"websites"> });
    } catch (error) {
      toast.error("Failed to toggle website status");
    }
  };

  const getRSSUrl = (websiteId: string) => {
    if (!siteUrl) return "";
    return `${siteUrl}/rss/feed_${websiteId}`;
  };

  const copyRSSUrl = (websiteId: string) => {
    const url = getRSSUrl(websiteId);
    void navigator.clipboard.writeText(url);
    toast.success("RSS URL copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      {siteUrl === undefined ? (
        <div className="text-center text-gray-500">
          Loading RSS feed URLs...
        </div>
      ) : (
        websites.map((website) => (
          <div
            key={website._id}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium">{website.title}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      website.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {website.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{website.url}</p>
                {website.description && (
                  <p className="text-gray-500 text-sm mb-2">
                    {website.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{website.articlesCount} articles</span>
                  {website.lastChecked && (
                    <span>
                      Last checked:{" "}
                      {new Date(website.lastChecked).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyRSSUrl(website._id)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Copy RSS URL
                </button>
                <button
                  onClick={() => void onScrapeNow(website._id)}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  Scrape Now
                </button>
                <button
                  onClick={() => void handleToggle(website._id)}
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                >
                  {website.isActive ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() =>
                    setEditingWebsite(
                      editingWebsite === website._id ? null : website._id
                    )
                  }
                  className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                >
                  {editingWebsite === website._id ? "Close Settings" : "Edit Settings"}
                </button>
                <button
                  onClick={() =>
                    setSelectedWebsite(
                      selectedWebsite === website._id ? null : website._id
                    )
                  }
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {selectedWebsite === website._id
                    ? "Hide Articles"
                    : "View Articles"}
                </button>
                <button
                  onClick={() => void handleRemove(website._id, website.title)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>RSS URL:</strong>{" "}
              <code className="bg-white px-2 py-1 rounded text-xs">
                {getRSSUrl(website._id) || "(unavailable)"}
              </code>
            </div>

            {editingWebsite === website._id && (
              <div className="mt-4 border-t pt-4">
                <EditWebsiteForm
                  website={website}
                  onCancel={() => setEditingWebsite(null)}
                  onSuccess={() => setEditingWebsite(null)}
                />
              </div>
            )}

            {crawlResults[website._id] && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Latest Crawl Run</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(
                      crawlResults[website._id].scrapedAt
                    ).toLocaleString()}
                  </span>
                </div>
                {crawlResults[website._id].articles.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No articles detected in this run.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {crawlResults[website._id].articles.map((article) => (
                      <div
                        key={article.guid}
                        className="p-3 bg-gray-50 rounded text-sm"
                      >
                        <h5 className="font-medium mb-1">{article.title}</h5>
                        <div className="flex justify-between items-center text-gray-500 text-xs">
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Article
                          </a>
                          <span>
                            {new Date(article.pubDate).toLocaleDateString()}
                          </span>
                        </div>
                        {article.description && (
                          <p className="mt-2 text-gray-600 text-xs">
                            {article.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedWebsite === website._id && (
              <div className="mt-4 border-t pt-4">
                <h4 className="font-medium mb-3">Recent Articles</h4>
                {articles === undefined ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : articles.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No articles found yet. Try scraping the website.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {articles.map((article) => (
                      <div
                        key={article._id}
                        className="p-3 bg-gray-50 rounded text-sm"
                      >
                        <h5 className="font-medium mb-1">{article.title}</h5>
                        <div className="flex justify-between items-center text-gray-500 text-xs">
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Article
                          </a>
                          <span>
                            {new Date(article.pubDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
