import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        if (typeof params.email !== "string") {
          throw new ConvexError("Invalid email.");
        }
        const email = params.email.toLowerCase();
        if (email !== "email@atimmer.com") {
          throw new ConvexError(
            "Sign up/login is restricted to a specific user."
          );
        }
        return { email };
      },
    }),
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
