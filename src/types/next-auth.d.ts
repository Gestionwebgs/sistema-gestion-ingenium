import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "RESPONSABLE";
    } & DefaultSession["user"];
  }

  interface User {
    role: "OWNER" | "RESPONSABLE";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "OWNER" | "RESPONSABLE";
  }
}
