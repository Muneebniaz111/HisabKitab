import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev logs Server Function args by default — that would print passwords from signIn/signUp.
  logging: { serverFunctions: false },
};

export default nextConfig;
