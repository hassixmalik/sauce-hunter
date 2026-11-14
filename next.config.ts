import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Inlined for the browser too, so "Today" matches the server's batch day.
  env: { TIMEZONE: process.env.TIMEZONE || "UTC" },
};
export default nextConfig;
