import { handleSearchDatabase } from "./src/services/bot/actions/search";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log("Testing simple search...");
    const res1 = await handleSearchDatabase({ city: "Mersin", rooms: "1+1" });
    console.log("Simple search result:", res1);

    console.log("\nTesting keyword search...");
    const res2 = await handleSearchDatabase({ search_keywords: ["Mersin", "Мерсин", "Mezitli"], price: 150000 });
    console.log("Keyword search result:", res2);
}

test();
