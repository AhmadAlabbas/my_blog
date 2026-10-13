# Editing your notebook

After installing on Hostinger, use /admin/ to publish and edit articles, book summaries, gallery images, YouTube videos, Home/About/Work text, and blog settings. Drafts remain private. The JSON files supply the initial content for a fresh installation; changes to JSON do not overwrite a live database.

## Articles and book summaries

Use the editor for title, subtitle, category, author, date, status, hero image, opening paragraph, and main text. Separate paragraphs with a blank line. Use `## Heading` and `> Pull quote` on separate lines. HTML is escaped.

Insert a local photo with `![Descriptive caption](assets/images/kfupm-campus-1600.webp)` on its own line. Use an uploaded asset path from the media library to add your own image.

Insert a video with `[youtube](https://www.youtube.com/watch?v=spUNpyF58BY)` on its own line. The homepage video collection supplies the display title and local poster for matching videos. Other valid YouTube links use a generic local poster. Videos stay off until consent and Play.

Book summaries have a separate ending/spoiler field. Keep the real cover, ISBN, and official information URL with the correct edition.

## Gallery and media

Upload JPEG, PNG, or WebP (up to 8 MB, 6000 pixels per side, and 20 megapixels). Uploads are re-encoded to WebP, metadata is removed, and images are resized to a maximum longest edge of 1600 pixels.

Add a gallery entry with a meaningful title, alt text, and category. Category names become filters automatically. Use London, KFUPM, or Artwork to join the initial collections. Lower display-order numbers appear first. For a coherent set, select photographs with controlled highlights, visible shadows, moderate saturation, and natural colors.

## Videos

Open YouTube videos in the dashboard. Add a valid HTTPS watch or youtu.be URL, title, creator, short description, and a local poster image. Edit or remove a video there. The initial three videos are by 3Blue1Brown; the posters are original artwork, not video frames. Keep the homepage collection focused (maximum 12).

## Before publication

Read the 10 initial articles and adjust their tone to your own voice. Their publication date is the site preparation date, October 9, 2026. They avoid invented personal experiences. KFUPM photographs must retain credit to Ahmed, source links, and CC BY-SA 4.0 licensing, including the edited versions. Photography and illustration provenance is in ILLUSTRATIONS.md and assets/images/credits.json.

The animated bookshelf appears only once, on the homepage. It respects reduced motion and can be paused. Contact messages are stored in the dashboard; email notifications and newsletter campaign delivery require a separate email provider.

## Personalization and artwork

See PERSONALIZATION-CHECKLIST.md for the most useful next material. You love reading and drawing; the site now includes a drawing-room feature. New generated illustrations are labeled as original editorial artwork, not your own handmade drawings. Upload your actual drawings to make the collection personal.

Unique animated studies: drawing (Home), waves (Science), orbit (Technology), mobile (About). Each has static fallback art and a reduced-motion-aware pause control. The original book animation stays on Home. Canvas drawings are authored in living-art.js and museum.py.

The large homepage hero uses a full-resolution studio drawing. Featured and article artwork preserves its full composition. Source files and final prompts are in originals/museum and ILLUSTRATIONS.md.

Homepage videos link directly to YouTube. Inline article videos remain consent-gated. Sharing uses the actual preview or self-hosted page URL.

## Social profiles

In the Hostinger dashboard, open Blog settings and enter the full HTTPS URLs for your YouTube, LinkedIn, X, and Instagram profiles. Both header and footer update. Leave any URL blank to show an unconfigured icon. No account handles have been invented.

For static-only builds, edit socialLinks in site.json and run build.py. The original platform icons are authored in museum.py.
