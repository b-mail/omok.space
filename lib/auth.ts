import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Removed for ephemeral setup
  providers: [
    CredentialsProvider({
      name: "Username",
      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "Enter your name",
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username) return null;

          // Simple approach: find user by name or create a new one
          let user = await prisma.user.findFirst({
            where: { name: credentials.username },
          });

          if (!user) {
            console.log("Creating new user:", credentials.username);
            user = await prisma.user.create({
              data: {
                name: credentials.username,
              },
            });
          }

          return {
            id: user.id,
            name: user.name,
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        // @ts-expect-error - session.user type does not include id by default
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
