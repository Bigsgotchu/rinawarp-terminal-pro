import SocialMediaBot from './social-media-bot.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bot = new SocialMediaBot();

console.log("🤖 RinaWarp Terminal Social Media Bot");
console.log("=====================================\n");

// Generate this week's schedule
const weeklySchedule = bot.generateWeeklySchedule();

// Save to JSON file
const jsonFile = bot.saveScheduleToFile(weeklySchedule);

// Generate readable version
const readableSchedule = bot.generateReadableSchedule(weeklySchedule);
const readableFile = path.join(__dirname, 'weekly-social-schedule.md');
fs.writeFileSync(readableFile, readableSchedule);
console.log(`📝 Readable schedule saved to: ${readableFile}`);

// Display today's content
const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
console.log(`\n📅 Today's Content (${today}):`);
console.log("=" .repeat(40));

if (weeklySchedule[today]) {
    Object.entries(weeklySchedule[today]).forEach(([platform, posts]) => {
        console.log(`\n${platform.toUpperCase()}:`);
        posts.forEach((post, index) => {
            console.log(`${index + 1}. ${post.text}`);
        });
    });
} else {
    console.log("No content scheduled for today. Enjoy your break! 😊");
}

console.log("\n🎯 Next Steps:");
console.log("1. Review the generated schedule files");
console.log("2. Customize content as needed");
console.log("3. Set up automation tools (Buffer, Hootsuite, etc.)");
console.log("4. Monitor engagement and adjust strategy");
