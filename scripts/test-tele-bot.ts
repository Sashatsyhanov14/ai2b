
// Using global fetch (Node 18+)

const WEBHOOK_URL = "http://localhost:3000/api/bot/telegram/webhook";
const CHAT_ID = 123456789;
const USER = {
    id: 123456789,
    is_bot: false,
    first_name: "Test",
    last_name: "User",
    username: "testuser",
    language_code: "ru"
};

async function sendUpdate(text: string) {
    console.log(`\n🔹 SENDING USER MESSAGE: "${text}"`);

    const payload = {
        update_id: Date.now(),
        message: {
            message_id: Date.now(),
            from: USER,
            chat: { id: CHAT_ID, type: "private", ...USER },
            date: Math.floor(Date.now() / 1000),
            text: text
        }
    };

    try {
        const start = Date.now();
        const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - start;

        const data = await res.json().catch(() => ({ error: "Invalid JSON" }));
        console.log(`✅ RESPONSE (${duration}ms):`, JSON.stringify(data, null, 2));

        // Note: The actual bot reply is sent via Telegram API, so we won't see it here 
        // UNLESS the bot logic returns data in the webhook response (which it usually doesn't, it sends async).
        // However, for SYSTEM_DEBUG we might check logs or if we modified it to return data.
        // Actually, our webhook returns { ok: true }.
        // To see the "Reply", we would need to mock the Telegram API URL too, but that's harder.
        // WE WILL RELY ON SERVER LOGS or if the bot errors out.

    } catch (e: any) {
        console.error("❌ ERROR:", e.message);
    }
}

async function runTests() {
    console.log("🚀 STARTING BOT SIMULATION...");

    // 1. Health Check / Start
    await sendUpdate("/start");
    await new Promise(r => setTimeout(r, 1000));

    // 2. System Debug (The new feature)
    await sendUpdate("SYSTEM_DEBUG");
    await new Promise(r => setTimeout(r, 2000));

    // 3. Search Query
    await sendUpdate("Квартира в Мерсине до 100к");
}

runTests();
