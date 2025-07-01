import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { WebsiteManager } from "./WebsiteManager";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">RSS Feed Generator</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Custom RSS Feed Generator</h1>
        <Authenticated>
          <p className="text-xl text-secondary mb-2">
            Welcome back, {loggedInUser?.email ?? "friend"}!
          </p>
          <p className="text-gray-600">
            Create RSS feeds for websites that don't have them. Monitor your favorite sites and get updates in your RSS reader.
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-secondary">Sign in to start creating custom RSS feeds</p>
        </Unauthenticated>
      </div>

      <Authenticated>
        <WebsiteManager />
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
