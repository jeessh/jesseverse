# jesseverse

Every app I build (from now on 👍) will be centralized AND will integrate with Poke. I always wanted to use my apps from imessage and now I can!

## How it works

Every app I build acts like an extension. Each one just needs three endpoints:

```
GET  /info          -> extension metadata for registration and UI
GET  /capabilities  -> what each app can do
POST /execute       -> runs the endpoint selected
```

Here's the long and difficult steps on attaching my apps to this hub:
1. Make app
2. Deploy the app's backend
3. Give URL

The hub doesn't care what an app does, just how to interact with it. This is done through an MCP protocol, which outlines what each app's API endpoints do to the respective app. The purpose of the hub is to centralize all my future apps into both an organized dashboard, and to have easy access to all of them through iMessage (my MOST used app 🔥).

## It's capabilities

| endpoint | What it does |
|---|---|
| `list_extensions` | Polls every extension and returns what they can do |
| `use` | Runs any action on any extension |

## Activity + analytics

oh yea also I keep track of what happens so when things inevitably break, I won't be too lost :D


## Stack

| | |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind |
| Backend | FastAPI, Python |
| MCP | FastMCP |
| Database | Supabase |
