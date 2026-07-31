# Supabase Setup Guide for Anv Checks

Follow these step-by-step instructions to configure your Supabase backend for Anv Checks.

## Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com/).
2. Create a new project. Give it a name and set a secure database password.
3. Once the project is provisioned, go to **Project Settings** -> **API** to retrieve:
   - **Project URL**
   - **Anon Public API Key**
   Copy these values. You will need to replace the placeholders at the top of [script.js](file:///d:/Anv%20Checks/script.js) with them.

---

## Step 2: Create Database Schema
Go to the **SQL Editor** in your Supabase Dashboard, create a new query, paste the following SQL, and run it. This creates all the required tables and RLS (Row Level Security) rules:

```sql
-- Profiles table
create table public.profiles (
    user_id uuid references auth.users on delete cascade primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    display_name text not null default 'Anv',
    avatar_glyph text not null default 'smile',
    counter_policy text not null default 'tasks'
);

-- Projects table
create table public.projects (
    id text primary key,
    user_id uuid references auth.users on delete cascade not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    name text not null,
    color text not null,
    icon text not null
);

-- Groups table
create table public.groups (
    id text primary key,
    user_id uuid references auth.users on delete cascade not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    name text not null,
    color text not null,
    icon text not null,
    position integer not null default 0
);

-- Tasks table
create table public.tasks (
    id text primary key,
    user_id uuid references auth.users on delete cascade not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    title text not null,
    description text default '',
    priority text default '',
    due_date text default '',
    project_id text references public.projects(id) on delete set null,
    group_id text references public.groups(id) on delete set null,
    icon text default '',
    done boolean not null default false,
    autodelete_policy text not null default 'never',
    subtasks jsonb not null default '[]'::jsonb,
    notes jsonb not null default '[]'::jsonb,
    expiry_time bigint,
    created_date text
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.groups enable row level security;
alter table public.tasks enable row level security;

-- Setup RLS Policies for Profiles
create policy "Users can manage their own profile" 
on public.profiles for all 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Setup RLS Policies for Projects
create policy "Users can manage their own projects" 
on public.projects for all 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Setup RLS Policies for Groups
create policy "Users can manage their own groups" 
on public.groups for all 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Setup RLS Policies for Tasks
create policy "Users can manage their own tasks" 
on public.tasks for all 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

---

## Step 3: Enable Realtime Replication
To enable realtime synchronization across devices, you must subscribe your tables to Supabase's publication channel. You can do this either via the UI or by running SQL commands.

### Option A: Run SQL Commands (Easiest)
Go back to the **SQL Editor**, create a new query, paste the following SQL, and run it:
```sql
-- Enable realtime replication for tables
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.profiles;
```

### Option B: Via the Supabase UI Dashboard
1. Go to **Database** -> **Replication** in the Supabase sidebar.
2. Click on the edit/active tables row under the **supabase_realtime** publication.
3. Toggle on replication for the following tables:
   - `tasks`
   - `projects`
   - `groups`
   - `profiles`

---

## Step 4: Configure Google OAuth
1. Go to **Authentication** -> **Providers** -> **Google** in your Supabase Dashboard.
2. Toggle Google Auth **Enabled**.
3. Retrieve your Google Cloud Console Web OAuth client Credentials (Client ID and Client Secret).
4. Paste the credentials into the Supabase inputs.
5. Copy the **Redirect URI** provided in the Supabase Google Auth card (usually `https://[your-project-ref].supabase.co/auth/v1/callback`).
6. Paste this Redirect URI into your Google Cloud OAuth Client credentials as an **Authorized Redirect URI**.
7. Save changes in both the Google Console and Supabase Dashboard.

---

## Step 5: Database Updates for Auto-Delete & Hold System
If you are upgrading an existing database, go to the **SQL Editor**, create a new query, paste the following SQL, and run it to add the new completion and hold columns:

```sql
alter table public.tasks 
add column completed_at timestamptz,
add column hold_deletion boolean default false,
add column hold_until timestamptz;

alter table public.groups 
add column hold_deletion boolean default false,
add column hold_until timestamptz;
```
