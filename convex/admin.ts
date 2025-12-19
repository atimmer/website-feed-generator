import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  createAccount,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";

export const resetDevPassword = action({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
    if (deployment !== "" && !deployment.startsWith("dev:")) {
      throw new Error("resetDevPassword is only allowed on dev deployments.");
    }

    const email = args.email.toLowerCase();
    if (email !== "email@atimmer.com") {
      throw new Error("Sign up/login is restricted to a specific user.");
    }
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    let account:
      | Awaited<ReturnType<typeof retrieveAccount>>["account"]
      | null = null;
    let userId:
      | Awaited<ReturnType<typeof retrieveAccount>>["user"]["_id"]
      | null = null;

    try {
      const existing = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email },
      });
      account = existing.account;
      userId = existing.user._id;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "InvalidAccountId"
      ) {
        throw error;
      }
    }

    if (account && userId) {
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: email, secret: args.newPassword },
      });
      await invalidateSessions(ctx, { userId });
    } else {
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.newPassword },
        profile: { email },
      });
    }

    return { success: true };
  },
});
