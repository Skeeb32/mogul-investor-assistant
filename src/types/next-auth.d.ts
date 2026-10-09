import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    accountId: string;
    role: "investor" | "analyst" | "admin";
  }
  interface Session {
    user: {
      id: string;
      accountId: string;
      role: "investor" | "analyst" | "admin";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId?: string;
    role?: "investor" | "analyst" | "admin";
  }
}
