# Canvas Study Buddy

A personal study assistant for Canvas LMS. MCP server for Claude Desktop that connects all your courses, deadlines, grades and feedback in one place.

Forked from [r-huijts/canvas-mcp](https://github.com/r-huijts/canvas-mcp) and rebuilt from teacher tools into a student-focused Study Buddy.

## Prerequisites

You need a **Canvas API Token**:

1. Go to [Canvas](https://fhict.instructure.com) > **Account** > **Settings**
2. Scroll to **"Approved Integrations"**
3. Click **"+ New Access Token"**, name it "Study Buddy", click **Generate**
4. **Copy the token** — you can only see it once!

## Quick Install (One-Click)

1. Download [`canvas-study-buddy-1.0.0.dxt`](https://github.com/i546927MehdiCetinkaya/canvas-study-buddy/releases/latest)
2. Open the `.dxt` file — when Windows asks which app to use, click **"Choose an app on your PC"** and browse to:
   ```
   C:\Users\<YourUsername>\AppData\Local\AnthropicClaude\claude.exe
   ```
3. Click **Install** when Claude Desktop prompts you
4. Enter your Canvas API Token and Base URL
5. Done — ask Claude *"What are my deadlines?"*

## Manual Installation

```bash
git clone https://github.com/i546927MehdiCetinkaya/canvas-study-buddy.git
cd canvas-study-buddy
npm install
cp .env.example .env        # then paste your token in .env
npm run build
```

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "canvas-study-buddy": {
      "command": "node",
      "args": ["/path/to/canvas-study-buddy/dist/index.js"],
      "env": {
        "CANVAS_API_TOKEN": "your_token_here",
        "CANVAS_BASE_URL": "https://fhict.instructure.com"
      }
    }
  }
}
```

Restart Claude Desktop and ask: *"What are my deadlines?"*

## Tools (29)

| Category | Tools |
|----------|-------|
| **Courses** | `get-all-courses` `get-course-overview` `get-course-syllabus` `get-course-files` `get-course-people` |
| **Deadlines** | `get-upcoming-deadlines` `get-missed-deadlines` `get-submission-status` `get-assignment-details` `get-assignment-rubric` |
| **Grades** | `get-my-grades` `get-assignment-feedback` `get-all-feedback` `get-unread-feedback` `get-rubric-scores` |
| **Content** | `get-page-content` `search-all-content` `get-module-content` `get-recent-updates` |
| **Communication** | `get-course-announcements` `get-all-announcements` `get-unread-announcements` `get-inbox-messages` `get-discussion-posts` |
| **Planning** | `get-study-progress` `get-course-calendar` `get-quiz-results` `get-learning-outcomes` `export-to-calendar` |

## Prompts (12)

| Prompt | What it does |
|--------|-------------|
| `morning-briefing` | Daily start: announcements, deadlines, new feedback |
| `get-todo` | Full todo list sorted by urgency |
| `week-overview` | Week overview with workload estimate |
| `vak-deep-dive` | Deep dive into one course |
| `assignment-briefing` | Everything about one assignment |
| `check-feedback` | Feedback analysis: patterns and improvement areas |
| `study-gap-analysis` | What have you missed? |
| `monday-morning` | Week start planning |
| `deadline-pressure` | Deadline pressure analysis |
| `end-of-week` | Week wrap-up |
| `health-check` | Study health check across all courses |
| `catch-up-plan` | Catch-up plan for a course |

## Urgency System

Deadlines are automatically marked:

- :red_circle: **Critical**: < 24 hours or missed
- :orange_circle: **Urgent**: < 3 days
- :yellow_circle: **Attention**: < 7 days
- :green_circle: **OK**: > 7 days

## Example Questions

- "What are my deadlines this week?"
- "Give me an overview of Cyber Security"
- "What feedback did I get recently?"
- "Where am I falling behind?"
- "Make a catch-up plan for Software Engineering"
- "Search for 'machine learning' across all courses"
- "Export my deadlines to a calendar file"

## Calendar Export (.ics)

Export deadlines as a `.ics` file and import into Google Calendar, Apple Calendar or Outlook.

Ask Claude: *"Export my deadlines to a calendar file"* — it saves `canvas-deadlines.ics` to your Downloads folder.

Each event includes the course name, assignment name, points, submission type, source module/page, and a direct link to Canvas. A reminder is set 24 hours before each deadline.

## Roadmap

**Multi-School Support** — Currently configured for Fontys (`fhict.instructure.com`). Future version will support Dutch institutions via a `SCHOOL` env variable (Fontys, HvA, TU/e, UvA, VU, HU, Saxion).

## Development

```bash
npm run dev              # development mode
npm run build            # compile TypeScript
npm run build-extension  # build .dxt extension
```

## Credits

Based on [canvas-mcp](https://github.com/r-huijts/canvas-mcp) by R.Huijts.
