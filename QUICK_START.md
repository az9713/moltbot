# Moltbot Quick Start Guide

Get up and running with Moltbot in 5 minutes, then explore 15 practical use cases to see what your personal AI assistant can do!

---

## 5-Minute Setup

### Step 1: Install (2 minutes)

```bash
# Install Moltbot globally
npm install -g moltbot@latest

# Verify installation
moltbot --version
```

### Step 2: Run the Wizard (3 minutes)

```bash
moltbot onboard --install-daemon
```

The wizard will guide you to:
1. Connect to an AI provider (Claude or GPT)
2. Set up at least one messaging channel
3. Start the gateway service

**That's it!** You now have a personal AI assistant running.

---

## Verify Everything Works

```bash
# Check that the gateway is running
moltbot channels status

# Send a test message
moltbot agent --message "Hello! What can you help me with?"
```

You should see a response from your AI assistant!

---

## 15 Quick Win Use Cases

These examples show practical things you can do right away. Each one takes just a few seconds!

---

### Use Case 1: Quick Question Answering

**Scenario**: You need a quick answer while working

```bash
moltbot agent --message "What's the keyboard shortcut for undo on Mac?"
```

**Expected response**: "The keyboard shortcut for undo on Mac is Command + Z (⌘Z)..."

**Try these too**:
```bash
moltbot agent --message "How many ounces in a cup?"
moltbot agent --message "What year did the iPhone first come out?"
moltbot agent --message "What's the population of Tokyo?"
```

**What you learned**: Moltbot gives instant answers to factual questions.

---

### Use Case 2: Writing Assistance

**Scenario**: You need help writing a professional email

```bash
moltbot agent --message "Help me write a polite email declining a meeting invitation because I have a conflict"
```

**Expected response**: A professionally written email you can copy and customize.

**Try these too**:
```bash
moltbot agent --message "Make this more formal: Hey, can't make the meeting tomorrow"
moltbot agent --message "Write a thank you note for a job interview"
moltbot agent --message "Help me write an out-of-office reply"
```

**What you learned**: Moltbot helps with all types of writing tasks.

---

### Use Case 3: Text Translation

**Scenario**: You received a message in another language

```bash
moltbot agent --message "Translate to English: Bonjour, comment allez-vous aujourd'hui?"
```

**Expected response**: "Hello, how are you today?"

**Try these too**:
```bash
moltbot agent --message "Translate 'Thank you very much' to Japanese"
moltbot agent --message "How do you say 'Where is the train station?' in Spanish?"
moltbot agent --message "Translate this menu item: Poulet rôti aux herbes de Provence"
```

**What you learned**: Moltbot translates between many languages instantly.

---

### Use Case 4: Code Explanation

**Scenario**: You encountered code you don't understand

```bash
moltbot agent --message "Explain what this Python code does: [x**2 for x in range(10) if x % 2 == 0]"
```

**Expected response**: A clear explanation that this is a list comprehension that creates squares of even numbers from 0 to 9.

**Try these too**:
```bash
moltbot agent --message "What does 'git rebase' do?"
moltbot agent --message "Explain the difference between == and === in JavaScript"
moltbot agent --message "What is a SQL JOIN?"
```

**What you learned**: Moltbot explains technical concepts in plain language.

---

### Use Case 5: Math and Calculations

**Scenario**: You need to do a calculation

```bash
moltbot agent --message "What's 15% tip on a $67.50 bill?"
```

**Expected response**: "$10.13 tip, making the total $77.63"

**Try these too**:
```bash
moltbot agent --message "Split $234.50 four ways including 20% tip"
moltbot agent --message "If I drive 340 miles at 65 mph, how long will it take?"
moltbot agent --message "Convert 72 degrees Fahrenheit to Celsius"
```

**What you learned**: Moltbot handles everyday math problems.

---

### Use Case 6: Summarizing Text

**Scenario**: You have a long article and need the key points

```bash
moltbot agent --message "Summarize in 3 bullet points: [paste your long text here]"
```

**Try this example**:
```bash
moltbot agent --message "Summarize in 3 bullet points: The Internet of Things (IoT) refers to the growing network of connected devices that communicate and share data over the internet. These devices range from simple sensors and smart home appliances to complex industrial machinery. IoT has transformed how we live and work by enabling automation, improving efficiency, and providing valuable data insights. However, it also raises significant concerns about privacy, security, and data management as billions of devices come online each year."
```

**Expected response**: Three concise bullet points covering the main ideas.

**What you learned**: Moltbot condenses long content into digestible summaries.

---

### Use Case 7: Brainstorming Ideas

**Scenario**: You need creative ideas for a project

```bash
moltbot agent --message "Give me 5 unique ideas for a birthday gift for someone who loves cooking"
```

**Expected response**: Five creative and specific gift suggestions.

**Try these too**:
```bash
moltbot agent --message "5 healthy lunch ideas I can meal prep on Sunday"
moltbot agent --message "Creative team building activities for remote workers"
moltbot agent --message "Unique date night ideas that don't involve restaurants"
```

**What you learned**: Moltbot is great for brainstorming and ideation.

---

### Use Case 8: Grammar and Proofreading

**Scenario**: You want to check your writing for errors

```bash
moltbot agent --message "Fix any grammar or spelling errors: Their going to the store to buy there groceries, but they dont know weather its open."
```

**Expected response**: "They're going to the store to buy their groceries, but they don't know whether it's open."

**Try these too**:
```bash
moltbot agent --message "Is this sentence correct? 'Me and him went to the movies.'"
moltbot agent --message "Make this clearer: The thing is that basically we need to do the stuff."
```

**What you learned**: Moltbot catches and corrects writing mistakes.

---

### Use Case 9: Learning New Concepts

**Scenario**: You want to understand something complex

```bash
moltbot agent --message "Explain blockchain to me like I'm 10 years old"
```

**Expected response**: A simple, easy-to-understand explanation using relatable analogies.

**Try these too**:
```bash
moltbot agent --message "What is machine learning in simple terms?"
moltbot agent --message "Explain how the stock market works"
moltbot agent --message "What are NFTs and why do people buy them?"
```

**What you learned**: Moltbot breaks down complex topics into understandable explanations.

---

### Use Case 10: Creating Lists and Plans

**Scenario**: You need an organized checklist

```bash
moltbot agent --message "Create a packing checklist for a 3-day beach vacation"
```

**Expected response**: An organized, comprehensive packing list.

**Try these too**:
```bash
moltbot agent --message "Weekly cleaning schedule for a 2-bedroom apartment"
moltbot agent --message "Checklist for hosting a dinner party for 8 people"
moltbot agent --message "What to do before going on a 2-week vacation (home prep checklist)"
```

**What you learned**: Moltbot creates organized lists and plans for any situation.

---

### Use Case 11: Recipe Assistance

**Scenario**: You have ingredients and need recipe ideas

```bash
moltbot agent --message "What can I make with chicken, rice, and bell peppers?"
```

**Expected response**: Several recipe suggestions with brief instructions.

**Try these too**:
```bash
moltbot agent --message "Quick dinner recipe using ground beef that takes under 30 minutes"
moltbot agent --message "Substitute for eggs in baking"
moltbot agent --message "How do I know when salmon is fully cooked?"
```

**What you learned**: Moltbot helps with cooking and meal planning.

---

### Use Case 12: Travel Planning

**Scenario**: You're planning a trip and need suggestions

```bash
moltbot agent --message "Top 5 must-see attractions in Paris for a first-time visitor"
```

**Expected response**: A curated list of top Paris attractions with brief descriptions.

**Try these too**:
```bash
moltbot agent --message "Best time of year to visit Japan"
moltbot agent --message "Budget-friendly things to do in New York City"
moltbot agent --message "What should I know before traveling to Morocco?"
```

**What you learned**: Moltbot provides travel advice and recommendations.

---

### Use Case 13: Professional Advice

**Scenario**: You need guidance on work situations

```bash
moltbot agent --message "How should I ask my boss for a raise?"
```

**Expected response**: Strategic advice and talking points for the conversation.

**Try these too**:
```bash
moltbot agent --message "How to handle a difficult coworker professionally"
moltbot agent --message "Good questions to ask at the end of a job interview"
moltbot agent --message "How to write a LinkedIn connection request"
```

**What you learned**: Moltbot gives practical professional guidance.

---

### Use Case 14: Health and Wellness Tips

**Scenario**: You want general wellness information

```bash
moltbot agent --message "5 simple stretches I can do at my desk"
```

**Expected response**: Easy stretching exercises with instructions.

**Try these too**:
```bash
moltbot agent --message "Tips for better sleep hygiene"
moltbot agent --message "How much water should I drink per day?"
moltbot agent --message "Simple mindfulness exercises for beginners"
```

**What you learned**: Moltbot provides general wellness tips (not medical advice).

---

### Use Case 15: Fun and Entertainment

**Scenario**: You want something fun or interesting

```bash
moltbot agent --message "Tell me an interesting fact I probably don't know"
```

**Expected response**: A fascinating, surprising fact.

**Try these too**:
```bash
moltbot agent --message "Give me a riddle to solve"
moltbot agent --message "Recommend a book similar to Project Hail Mary"
moltbot agent --message "What's a fun party game for 6 people?"
```

**What you learned**: Moltbot can be entertaining too!

---

## Using Moltbot Through Messaging Apps

All these use cases work through your connected messaging apps too!

### Via WhatsApp/Telegram/Discord

Just send the same messages through your connected app:

**Example on WhatsApp**:
1. Open WhatsApp
2. Go to your Moltbot conversation (or the linked number)
3. Send: "What's 18% tip on $45?"
4. Get your answer in WhatsApp!

### Via Command Line with Extended Thinking

For complex questions, use extended thinking mode:

```bash
moltbot agent --message "Analyze the pros and cons of remote work for software engineers" --thinking high
```

This makes the AI think more deeply before responding.

---

## Next Steps

Now that you've seen what Moltbot can do, here are some suggestions:

### Connect More Channels

```bash
# See available channels
moltbot channels list

# Connect Telegram
moltbot channels connect telegram

# Connect Discord
moltbot channels connect discord
```

### Customize Your Experience

```bash
# See current configuration
moltbot config list

# Change the AI model
moltbot config set model "claude-3-opus-20240229"
```

### Learn More Commands

```bash
# Get help on any command
moltbot --help
moltbot agent --help
moltbot channels --help
```

### Read the Full Documentation

- [User Guide](USER_GUIDE.md) - Complete usage instructions
- [docs.molt.bot](https://docs.molt.bot) - Full online documentation
- [Developer Guide](DEVELOPER_GUIDE.md) - If you want to contribute

---

## Tips for Getting the Best Results

### 1. Be Specific

Instead of: "Help me with my resume"
Try: "Review the experience section of my resume and suggest improvements for a software engineering role"

### 2. Provide Context

Instead of: "Is this a good idea?"
Try: "I'm considering switching from marketing to data analysis. I have 5 years of marketing experience. Is this a good career move?"

### 3. Ask Follow-up Questions

Start with a question, then dive deeper:
1. "What is machine learning?"
2. "Give me a specific example of supervised learning"
3. "How would I start learning machine learning as a beginner?"

### 4. Request Specific Formats

- "Give me this as a bulleted list"
- "Explain this in 3 sentences or less"
- "Format this as a table"
- "Write this as an email"

---

## Troubleshooting Quick Fixes

### Gateway Not Running

```bash
# Start the gateway
moltbot gateway run

# Or restart
moltbot gateway restart
```

### Channel Disconnected

```bash
# Check status
moltbot channels status

# Reconnect
moltbot channels connect <channel-name>
```

### Need to Reset

```bash
# Run diagnostics
moltbot doctor

# Reset and start over
moltbot doctor --reset
moltbot onboard
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Ask a question | `moltbot agent --message "Your question"` |
| Check status | `moltbot channels status` |
| Connect channel | `moltbot channels connect <name>` |
| View config | `moltbot config list` |
| Get help | `moltbot --help` |
| Run diagnostics | `moltbot doctor` |

---

**Congratulations!** You now know how to use Moltbot effectively. Start with these use cases and explore from there. Your personal AI assistant is ready to help!

Have questions? Join the community at [discord.gg/clawd](https://discord.gg/clawd).
