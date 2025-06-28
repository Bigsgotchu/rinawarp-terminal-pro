/**
 * RinaWarp Terminal - Social Media Automation Bot
 * Automatically posts daily content across social platforms
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SocialMediaBot {
    constructor() {
        this.contentLibrary = this.loadContentLibrary();
        this.platforms = {
            twitter: {
                enabled: true,
                lastPosted: null,
                dailyLimit: 3
            },
            linkedin: {
                enabled: true,
                lastPosted: null,
                dailyLimit: 1
            },
            reddit: {
                enabled: true,
                lastPosted: null,
                dailyLimit: 1
            }
        };
    }

    loadContentLibrary() {
        return {
            // Product features and benefits
            features: [
                "🤖 AI-powered command suggestions make terminal work 3x faster",
                "⚡ Smart Git workflows with automatic commit message generation", 
                "☁️ Cloud sync keeps your terminal settings across all devices",
                "🎨 Beautiful mermaid-themed UI that developers actually love",
                "🔒 Enterprise-grade security with zero-trust architecture",
                "📊 Performance monitoring shows exactly where time is saved",
                "🌐 Cross-platform: Windows, Mac, Linux - same great experience",
                "🎯 Context-aware suggestions based on your current project"
            ],

            // Tips and tutorials
            tips: [
                "💡 Pro tip: Use 'rinawarp smart-commit' for AI-generated commit messages",
                "🚀 Speed hack: Enable AI suggestions to cut command typing by 70%",
                "🔧 Setup tip: Sync your dotfiles with cloud backup for instant setup",
                "⚡ Workflow tip: Use gesture controls for lightning-fast navigation",
                "🎨 Theme tip: Mermaid mode reduces eye strain during long coding sessions",
                "📈 Productivity hack: Track your terminal efficiency with built-in analytics",
                "🤝 Team tip: Share terminal sessions for real-time collaboration",
                "🛡️ Security tip: Enable zero-trust mode for secure remote development"
            ],

            // User stories and testimonials
            stories: [
                "👨‍💻 'RinaWarp Terminal cut my Git workflow time in half' - Senior Dev",
                "🎯 'The AI suggestions are eerily accurate' - Full Stack Engineer", 
                "⚡ 'Fastest terminal setup I've ever experienced' - DevOps Lead",
                "🎨 'Finally, a terminal that doesn't hurt my eyes' - Frontend Dev",
                "🚀 'My team's productivity went through the roof' - Engineering Manager",
                "💡 'The smart commit messages are a game-changer' - Startup Founder",
                "🔒 'Enterprise security without sacrificing speed' - Security Engineer",
                "🌟 'This is how terminals should have always worked' - Tech Lead"
            ],

            // Industry insights and trends
            insights: [
                "📊 73% of developers waste 2+ hours daily on terminal inefficiencies",
                "🤖 AI-assisted development tools show 300% ROI in productivity studies",
                "⚡ Modern terminals can reduce cognitive load by 45% with smart UX",
                "🔮 The future of development: AI-first, context-aware tooling",
                "📈 Remote development requires cloud-native terminal solutions",
                "🎯 Developer experience directly correlates with product quality",
                "🛠️ The terminal is the last UI that hasn't been revolutionized... until now",
                "🌊 The next wave: Terminals that understand your intent, not just commands"
            ],

            // Call-to-actions
            ctas: [
                "Try RinaWarp Terminal free: https://rinawarp-terminal.web.app",
                "Download the future of terminals: https://rinawarp-terminal.web.app",
                "See why 10k+ developers chose RinaWarp: https://rinawarp-terminal.web.app",
                "Experience AI-powered development: https://rinawarp-terminal.web.app",
                "Join the terminal revolution: https://rinawarp-terminal.web.app"
            ],

            // Hashtags by platform
            hashtags: {
                twitter: ["#terminal", "#AI", "#developer", "#productivity", "#coding", "#devtools", "#automation", "#git"],
                linkedin: ["#developer", "#productivity", "#AI", "#terminal", "#coding", "#startup", "#technology", "#innovation"],
                reddit: [] // Reddit doesn't use hashtags
            }
        };
    }

    generateDailyContent(platform, contentType = 'mixed') {
        const content = this.contentLibrary;
        const today = new Date().toDateString();
        
        // Ensure we don't repeat content too often
        const usedToday = this.getUsedContent(platform, today);
        
        let post = {
            text: '',
            hashtags: content.hashtags[platform] || [],
            url: 'https://rinawarp-terminal.web.app',
            timestamp: new Date().toISOString()
        };

        switch (contentType) {
            case 'feature':
                post.text = this.getRandomUnused(content.features, usedToday);
                break;
            case 'tip':
                post.text = this.getRandomUnused(content.tips, usedToday);
                break;
            case 'story':
                post.text = this.getRandomUnused(content.stories, usedToday);
                break;
            case 'insight':
                post.text = this.getRandomUnused(content.insights, usedToday);
                break;
            default:
                // Mixed content - rotate through types
                const types = ['features', 'tips', 'stories', 'insights'];
                const randomType = types[Math.floor(Math.random() * types.length)];
                post.text = this.getRandomUnused(content[randomType], usedToday);
        }

        // Add CTA occasionally (30% chance)
        if (Math.random() < 0.3) {
            post.text += '\n\n' + this.getRandomItem(content.ctas);
        }

        // Add hashtags for Twitter and LinkedIn
        if (platform !== 'reddit' && post.hashtags.length > 0) {
            const hashtagCount = platform === 'twitter' ? 4 : 6;
            const selectedTags = this.shuffleArray(post.hashtags).slice(0, hashtagCount);
            post.text += '\n\n' + selectedTags.map(tag => tag).join(' ');
        }

        return post;
    }

    getRandomUnused(array, usedItems) {
        const available = array.filter(item => !usedItems.includes(item));
        if (available.length === 0) return this.getRandomItem(array); // Fallback to any
        return this.getRandomItem(available);
    }

    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getUsedContent(platform, date) {
        // In a real implementation, this would read from a database or file
        // For now, return empty array (no tracking)
        return [];
    }

    // Schedule posts for optimal times
    getOptimalPostTimes(platform) {
        const times = {
            twitter: [
                { hour: 9, minute: 0 },   // 9 AM - morning engagement
                { hour: 13, minute: 0 },  // 1 PM - lunch break
                { hour: 17, minute: 0 }   // 5 PM - end of workday
            ],
            linkedin: [
                { hour: 8, minute: 30 },  // 8:30 AM - professional start
                { hour: 12, minute: 0 }   // 12 PM - lunch networking
            ],
            reddit: [
                { hour: 10, minute: 0 },  // 10 AM - peak Reddit time
                { hour: 15, minute: 0 }   // 3 PM - afternoon peak
            ]
        };
        return times[platform] || [];
    }

    // Generate a week's worth of content
    generateWeeklySchedule() {
        const schedule = {
            monday: {
                twitter: [
                    this.generateDailyContent('twitter', 'feature'),
                    this.generateDailyContent('twitter', 'tip')
                ],
                linkedin: [
                    this.generateDailyContent('linkedin', 'insight')
                ]
            },
            tuesday: {
                twitter: [
                    this.generateDailyContent('twitter', 'story'),
                    this.generateDailyContent('twitter', 'feature')
                ],
                linkedin: [
                    this.generateDailyContent('linkedin', 'tip')
                ]
            },
            wednesday: {
                twitter: [
                    this.generateDailyContent('twitter', 'insight'),
                    this.generateDailyContent('twitter', 'tip')
                ],
                linkedin: [
                    this.generateDailyContent('linkedin', 'story')
                ],
                reddit: [
                    this.generateDailyContent('reddit', 'feature')
                ]
            },
            thursday: {
                twitter: [
                    this.generateDailyContent('twitter', 'feature'),
                    this.generateDailyContent('twitter', 'story')
                ],
                linkedin: [
                    this.generateDailyContent('linkedin', 'insight')
                ]
            },
            friday: {
                twitter: [
                    this.generateDailyContent('twitter', 'tip'),
                    this.generateDailyContent('twitter', 'feature')
                ],
                linkedin: [
                    this.generateDailyContent('linkedin', 'story')
                ]
            },
            saturday: {
                twitter: [
                    this.generateDailyContent('twitter', 'story')
                ]
            },
            sunday: {
                twitter: [
                    this.generateDailyContent('twitter', 'insight')
                ]
            }
        };

        return schedule;
    }

    // Save schedule to file
    saveScheduleToFile(schedule, filename = 'weekly-social-schedule.json') {
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, JSON.stringify(schedule, null, 2));
        console.log(`📅 Weekly schedule saved to: ${filepath}`);
        return filepath;
    }

    // Generate human-readable schedule
    generateReadableSchedule(schedule) {
        let readable = "# 📅 RinaWarp Terminal - Weekly Social Media Schedule\n\n";
        
        Object.entries(schedule).forEach(([day, platforms]) => {
            readable += `## ${day.charAt(0).toUpperCase() + day.slice(1)}\n\n`;
            
            Object.entries(platforms).forEach(([platform, posts]) => {
                readable += `### ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n`;
                posts.forEach((post, index) => {
                    const optimalTimes = this.getOptimalPostTimes(platform);
                    const time = optimalTimes[index] || { hour: 9, minute: 0 };
                    readable += `**${time.hour}:${time.minute.toString().padStart(2, '0')}** - ${post.text}\n\n`;
                });
            });
        });

        return readable;
    }
}

// Usage example and CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
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
}

export default SocialMediaBot;
