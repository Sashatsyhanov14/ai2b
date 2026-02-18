// scripts/test-agent.ts
// Usage: npx tsx scripts/test-agent.ts

import { config } from "dotenv";
config(); // Load .env file

import { handleMessage } from "../src/services/bot/handlers/messageHandler";

// Mock env specific to bot if needed, but Supabase needs real envs loaded by dotenv above
if (!process.env.TELEGRAM_BOT_TOKEN) process.env.TELEGRAM_BOT_TOKEN = "TEST_TOKEN";
if (!process.env.TELEGRAM_BOT_ID) process.env.TELEGRAM_BOT_ID = "TEST_BOT";
// Ensure OPENROUTER_API_KEY is in .env or set here

async function runTest() {
    console.log("🚀 Starting Agent Test...");

    // Mock Data
    const chatId = "123456";
    const userText = "Find me a cheap flat in Mersin under 100k and show me photos";

    const userInfo = {
        username: "test_dev",
        fullName: "Test Developer",
        language_code: "en"
    };

    try {
        await handleMessage(
            userText,
            chatId,
            "TEST_TOKEN",
            "TEST_BOT",
            userInfo,
            {} // update
        );
        console.log("✅ Agent Finished.");
    } catch (e) {
        console.error("❌ Agent Failed:", e);
    }
}

runTest();
