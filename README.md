# Jessiverse

Your personal organization hub with modular apps and phone-based interaction via Poke.

## Project Structure

```
jessiverse/
├── frontend/          # Next.js app
├── backend/           # FastAPI app
└── supabase/          # Database migrations
```

## Quick Start

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and keys from Settings > API

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file and fill in values
cp .env.example .env

# Run locally
uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file and fill in values
cp .env.local.example .env.local

# Run locally
npm run dev
```

## Adding New Apps

### Backend

1. Copy the template:
   ```bash
   cp -r backend/app/apps/_template backend/app/apps/myapp
   ```

2. Edit the files:
   - `router.py` - Change `PREFIX` and `TAGS`, add your endpoints
   - `models.py` - Define your Pydantic schemas
   - `service.py` - Implement your business logic, change `TABLE_NAME`

3. The app auto-registers on startup!

4. (Optional) Add a Poke command in `__init__.py`:
   ```python
   from app.apps import register_message_handler
   
   async def handle_mycommand(message: str, phone: str) -> str:
       return "Response to SMS"
   
   register_message_handler("mycommand", handle_mycommand)
   ```

### Frontend

1. Add to the app registry (`src/apps/registry.ts`):
   ```typescript
   {
     id: "myapp",
     name: "My App",
     description: "What it does",
     route: "myapp",
     icon: SomeIcon,
     showInSidebar: true,
     showOnDashboard: true,
     color: "#hexcolor",
     enabled: true,
   }
   ```

2. Create the page at `src/app/(dashboard)/myapp/page.tsx`

3. (Optional) Add app-specific components in `src/components/apps/myapp/`

## Deployment (Vercel)

### Frontend

1. Connect your repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables

### Backend

1. Create a new Vercel project
2. Set root directory to `backend`
3. Add environment variables
4. Update `CORS_ORIGINS` to include your frontend URL

## Poke Integration

The backend exposes a webhook at `POST /api/poke/webhook` that accepts:

```json
{
  "message": "help",
  "phone_number": "+1234567890"
}
```

Configure this URL in your Poke settings to receive SMS commands.

## Environment Variables

### Backend (.env)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)
- `CORS_ORIGINS` - JSON array of allowed origins
- `POKE_WEBHOOK_SECRET` - Secret for validating Poke webhooks

### Frontend (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `NEXT_PUBLIC_API_URL` - Backend API URL
