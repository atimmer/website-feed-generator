import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

interface WebsiteSettings {
  _id: Id<"websites">;
  url: string;
  title: string;
  description?: string;
}

interface EditWebsiteFormProps {
  website: WebsiteSettings;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EditWebsiteForm({
  website,
  onCancel,
  onSuccess,
}: EditWebsiteFormProps) {
  const [url, setUrl] = useState(website.url);
  const [title, setTitle] = useState(website.title);
  const [description, setDescription] = useState(website.description ?? "");

  const updateWebsite = useMutation(api.websites.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url || !title) {
      toast.error("URL and title are required");
      return;
    }

    try {
      await updateWebsite({
        websiteId: website._id,
        url: url.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
      });

      toast.success("Website updated successfully!");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update website");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="text-base font-medium">Edit Feed Settings</h4>

      <div>
        <label htmlFor="edit-url" className="block text-sm font-medium text-gray-700 mb-1">
          Website URL *
        </label>
        <input
          type="url"
          id="edit-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
          Feed Title *
        </label>
        <input
          type="text"
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Favorite Blog"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="RSS feed for my favorite blog posts"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
