

## Plan: Optimize Homepage Banner with Carousel and Admin Management

### 1. Create Database Table for Banner Management

Create a `hero_banners` table so admins can manage banner slides from the backend:

```sql
CREATE TABLE public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  cta_primary_text text,
  cta_primary_link text,
  cta_secondary_text text,
  cta_secondary_link text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Public read, admin write
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.hero_banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage banners" ON public.hero_banners
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
```

Insert 3 default banners with Unsplash photography images.

### 2. Rewrite HeroSection Component

Replace the static `HeroSection` with a carousel-based banner:

- **Height**: `min-h-[50vh] max-h-[60vh]` instead of `min-h-[80vh]`
- **Carousel**: Use Embla via existing `Carousel` components + `Autoplay` plugin (5s interval)
- **Background images**: Full-screen per slide with `object-cover`
- **Left-aligned text** with gradient overlay (black-to-transparent from left)
- **Glassmorphism text container**: `backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl p-8`
- **Simplified copy**:
  - Title: 用光影說故事，與同好共鳴
  - Subtitle: 全台最活躍的攝影創作者社群，分享作品、交流心得。
- **No stats block**
- **Dots indicator** at bottom center
- **Left/right arrows** on hover
- **Responsive**: On mobile, text stacks naturally, height uses `min-h-[40vh]`
- Data fetched from `hero_banners` table via React Query, with hardcoded fallbacks

### 3. Create Admin Banner Management Page

New page at `/admin/banners` (`src/pages/admin/BannerManagement.tsx`):

- List all banners (active/inactive) with drag-to-reorder or sort_order input
- Add/edit banner: form with title, subtitle, image URL upload, CTA text/link, active toggle
- Delete banner
- Preview thumbnail

### 4. Add Admin Navigation Link

Update `AdminLayout.tsx` sidebar to include "Banner管理" link to `/admin/banners`.

### 5. Add Route

Add `/admin/banners` route in `App.tsx`.

### Files to Create
- `src/pages/admin/BannerManagement.tsx` — Admin CRUD for banners

### Files to Modify
- `src/components/home/HeroSection.tsx` — Full rewrite to carousel with DB data
- `src/components/admin/AdminLayout.tsx` — Add sidebar link
- `src/App.tsx` — Add route

### Technical Details
- Uses existing `embla-carousel-react` + `embla-carousel-autoplay` packages
- Uses existing `Carousel` UI components from `src/components/ui/carousel.tsx`
- Fallback: if no banners in DB, show 3 hardcoded Unsplash images
- Image upload for banners will use the existing storage bucket pattern

