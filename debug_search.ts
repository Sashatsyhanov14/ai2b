
import { handleSearchDatabase } from "./src/services/bot/actions/search";
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Testing Search...");

    // Test 1: Broad search
    console.log("--- Search 1: Mersin, < 120000 ---");
    const res1 = await handleSearchDatabase({ city: "Mersin", price: 120000 });
    console.log(res1);

    // Test 2: Specific rooms
    console.log("--- Search 2: Mersin, < 120000, 2+1 rooms ---");
    const res2 = await handleSearchDatabase({ city: "Mersin", price: 120000, rooms: "2+1" });
    console.log(res2);
}

test();
