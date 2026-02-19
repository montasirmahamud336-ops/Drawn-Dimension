-- Create reviews table
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  role text not null,
  company text,
  content text not null,
  rating integer default 5,
  image_url text,
  status text default 'draft'
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Create policies
create policy "Public reviews are viewable by everyone."
  on public.reviews for select
  using ( status = 'live' );

create policy "Admins can do everything with reviews."
  on public.reviews for all
  using ( true )
  with check ( true );
