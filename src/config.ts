import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-pyramid",
  description: "Watch your downline grow — scan a QR to recruit, see your tree fanout in real time",
  accentHex: "#fb7185",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
