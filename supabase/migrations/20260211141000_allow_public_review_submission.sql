-- Allow website users to submit testimonials directly.
DROP POLICY IF EXISTS "Anyone can submit testimonials" ON public.testimonials;
CREATE POLICY "Anyone can submit testimonials"
  ON public.testimonials
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (is_published = true);
