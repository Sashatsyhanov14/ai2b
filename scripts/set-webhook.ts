// scripts/set-webhook.ts
// Usage: npx tsx scripts/set-webhook.ts https://your-domain.com

import { config } from "dotenv";
config(); // Load .env

const token = process.env.TELEGRAM_BOT_TOKEN;
const domain = process.argv[2];

if (!token) {
    console.error("❌ Error: TELEGRAM_BOT_TOKEN is missing in .env");
    process.exit(1);
}

if (!domain) {
    console.error("❌ Error: Please provide your domain URL.");
    console.log("Usage: npx tsx scripts/set-webhook.ts https://your-domain.com");
    process.exit(1);
}

// Ensure domain has no trailing slash and includes https
let url = domain.replace(/\/$/, "");
if (!url.startsWith("http")) {
    url = "https://" + url;
}

const webhookUrl = url + "/api/bot/telegram/webhook";

console.log(`Setting webhook to: ${webhookUrl}`);

async function setWebhook() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        const data = await res.json();
        console.log("Response:", data);
        if (data.ok) {
            console.log("✅ Webhook set successfully!");
        } else {
            console.error("❌ Failed to set webhook:", data.description);
        }
    } catch (e) {
        console.error("❌ Network error:", e);
    }
}

setWebhook();
