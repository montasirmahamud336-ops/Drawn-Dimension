-- Normalize apex domain image URLs to www to eliminate 301 redirect hops
UPDATE projects 
SET image_url = REPLACE(image_url, 'https://drawndimension.com/', 'https://www.drawndimension.com/')
WHERE image_url LIKE 'https://drawndimension.com/%';

UPDATE projects 
SET image_url = REPLACE(image_url, 'http://drawndimension.com/', 'https://www.drawndimension.com/')
WHERE image_url LIKE 'http://drawndimension.com/%';

-- Also update URLs inside JSON/JSONB media column if present
UPDATE projects
SET media = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'url' LIKE 'https://drawndimension.com/%' 
      THEN jsonb_set(elem, '{url}', to_jsonb(REPLACE(elem->>'url', 'https://drawndimension.com/', 'https://www.drawndimension.com/')))
      WHEN elem->>'url' LIKE 'http://drawndimension.com/%' 
      THEN jsonb_set(elem, '{url}', to_jsonb(REPLACE(elem->>'url', 'http://drawndimension.com/', 'https://www.drawndimension.com/')))
      ELSE elem
    END
  )
  FROM jsonb_array_elements(media::jsonb) AS elem
)
WHERE media IS NOT NULL AND jsonb_typeof(media::jsonb) = 'array';

-- Update team member avatar and image URLs
UPDATE team 
SET image_url = REPLACE(image_url, 'https://drawndimension.com/', 'https://www.drawndimension.com/')
WHERE image_url LIKE 'https://drawndimension.com/%';

UPDATE team 
SET avatar_url = REPLACE(avatar_url, 'https://drawndimension.com/', 'https://www.drawndimension.com/')
WHERE avatar_url LIKE 'https://drawndimension.com/%';

-- Update products
UPDATE products 
SET image_url = REPLACE(image_url, 'https://drawndimension.com/', 'https://www.drawndimension.com/')
WHERE image_url LIKE 'https://drawndimension.com/%';
