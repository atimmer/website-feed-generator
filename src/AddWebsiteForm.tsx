import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface AddWebsiteFormProps {
  onSuccess: () => void;
}

export function AddWebsiteForm({ onSuccess }: AddWebsiteFormProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  const addWebsite = useMutation(api.websites.add);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url || !title) {
      toast.error("URL and title are required");
      return;
    }

    try {
      await addWebsite({
        url: url.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        customInstructions: customInstructions.trim() || undefined,
      });
      
      toast.success("Website added successfully!");
      setUrl("");
      setTitle("");
      setDescription("");
      setCustomInstructions("");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add website");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-medium">Add New Website</h3>
      
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
          Website URL *
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Feed Title *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Favorite Blog"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="RSS feed for my favorite blog posts"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="custom-instructions"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Custom instructions
        </label>
        <textarea
          id="custom-instructions"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="Example: Only include blog posts, ignore job listings."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Website
        </button>
        <button
          type="button"
          onClick={onSuccess}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
