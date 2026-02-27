# jesseverse

My personal hub. Every app I build (from now on 👍) will integrate with Poke. I always wanted to use my apps from imessage and now I can!

## How it works

Every app I build acts like an extension. Each one just needs two endpoints:

```
GET  /capabilities  →  list of actions it can do
POST /execute       →  run one of those actions
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


## Stack

| | |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind |
| Backend | FastAPI, Python |
| MCP | FastMCP |
| Database | Supabase |
