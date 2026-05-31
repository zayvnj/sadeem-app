-- Create Users Table (Firebase Auth compatible)
CREATE TABLE public.users (
    id TEXT PRIMARY KEY, -- Matches Firebase UID
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Posts Table
CREATE TABLE public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Stories Table
CREATE TABLE public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create Story Views Table
CREATE TABLE public.story_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    viewer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(story_id, viewer_id)
);

-- Create Reels Table
CREATE TABLE public.reels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Post Likes Table
CREATE TABLE public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(post_id, user_id)
);

-- Create Reel Likes Table
CREATE TABLE public.reel_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(reel_id, user_id)
);

-- Create Post Comments Table
CREATE TABLE public.post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Reel Comments Table
CREATE TABLE public.reel_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Messages Table (1-on-1 chats)
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Note on Firebase Auth custom JWTs:
-- We use (auth.jwt() ->> 'sub') to extract the Firebase UID string from the JWT,
-- since auth.uid() only returns UUID types.

-- RLS Policies for Users
CREATE POLICY "Users are viewable by all authenticated users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = id);
CREATE POLICY "Users can delete their own profile" ON public.users FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = id);

-- RLS Policies for Posts
CREATE POLICY "Posts are viewable by all authenticated users" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- RLS Policies for Stories
CREATE POLICY "Stories are viewable by all authenticated users" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own stories" ON public.stories FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own stories" ON public.stories FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- RLS Policies for Story Views
CREATE POLICY "Story views are viewable by all authenticated users" ON public.story_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own story views" ON public.story_views FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = viewer_id);

-- RLS Policies for Reels
CREATE POLICY "Reels are viewable by all authenticated users" ON public.reels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own reels" ON public.reels FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own reels" ON public.reels FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own reels" ON public.reels FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- RLS Policies for Post Likes
CREATE POLICY "Post likes are viewable by all authenticated users" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own post likes" ON public.post_likes FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own post likes" ON public.post_likes FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- RLS Policies for Reel Likes
CREATE POLICY "Reel likes are viewable by all authenticated users" ON public.reel_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own reel likes" ON public.reel_likes FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own reel likes" ON public.reel_likes FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- RLS Policies for Post Comments
CREATE POLICY "Post comments are viewable by all authenticated users" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own post comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own post comments" ON public.post_comments FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own post comments" ON public.post_comments FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- RLS Policies for Reel Comments
CREATE POLICY "Reel comments are viewable by all authenticated users" ON public.reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own reel comments" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own reel comments" ON public.reel_comments FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own reel comments" ON public.reel_comments FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- RLS Policies for Messages
CREATE POLICY "Messages are viewable by sender or receiver" ON public.messages FOR SELECT TO authenticated USING (((auth.jwt() ->> 'sub') = sender_id) OR ((auth.jwt() ->> 'sub') = receiver_id));
CREATE POLICY "Users can insert messages as sender" ON public.messages FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = sender_id);
