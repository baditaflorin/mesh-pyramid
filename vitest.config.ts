import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "yjs", "y-webrtc"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        // Force these UI/sensor deps to be transformed by Vite (which respects
        // dedupe) instead of pre-bundled by Vitest (which inlines its own React
        // ref and breaks the dedupe contract).
        inline: [/@radix-ui\//, /sonner/, /react-day-picker/, /^@baditaflorin\/mesh-common$/],
      },
    },
  },
});
