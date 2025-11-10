// src/routes/config.js
export async function handleRemoteConfig(request, env, ctx) {
  const config = {
    adUnitId: "test-banner-001",
    adFrequency: "medium",
    categories: ["love", "money", "health"],
    experimentGroup: "A",
    version: "1.0.0",
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
