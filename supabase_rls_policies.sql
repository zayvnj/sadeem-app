-- supabase_rls_policies.sql
-- These policies are to be applied via the Supabase SQL Editor.
-- They ensure that authenticated users have the correct access rights to the 'follows' and 'posts' tables.

-- ==========================
-- 'follows' Table Policies
-- ==========================

-- Allow users to see who follows who
CREATE POLICY "Users can view all follows"
ON public.follows
FOR SELECT
USING (true);

-- Allow users to follow someone (insert a row where follower_id is their own ID)
CREATE POLICY "Users can insert their own follows"
ON public.follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Allow users to unfollow someone (delete a row where follower_id is their own ID)
CREATE POLICY "Users can delete their own follows"
ON public.follows
FOR DELETE
USING (auth.uid() = follower_id);

-- Note: Ensure Row Level Security (RLS) is enabled on the table
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ==========================
-- 'posts' Table Policies
-- ==========================

-- Allow anyone to view posts
CREATE POLICY "Users can view all posts"
ON public.posts
FOR SELECT
USING (true);

-- Allow users to create posts
CREATE POLICY "Users can insert their own posts"
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
USING (auth.uid() = user_id);

-- Note: Ensure Row Level Security (RLS) is enabled on the table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
