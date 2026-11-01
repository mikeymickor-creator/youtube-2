YOUTUBE 2 — STARTER WEBSITE
============================

WHAT'S INCLUDED
- index.html: page structure
- style.css: classic red, white, and gray styling
- main.js: search, category filters, video player, likes, subscriptions, and local video preview
- videos.json: starter video catalog
- videos.xml: optional XML category feed
- site.xml: website name and theme settings

HOW TO RUN IT
1. Extract the YouTube2 folder.
2. Open the folder in Visual Studio Code.
3. Start a local web server in this folder. If you have the VS Code Live Server extension,
   right-click index.html and choose "Open with Live Server".
   Alternatively, if Python is installed, open the VS Code terminal and run:
       python -m http.server 8000
   Then visit:
       http://localhost:8000
4. Do not just double-click index.html. The browser may block fetch() from loading JSON/XML
   when the page is opened directly as a file.

HOW TO ADD YOUR OWN VIDEOS
Open videos.json and copy one video object inside the "videos" array. Change:
- id: a unique ID
- title: video title
- channel: channel name
- category: Music, Gaming, Animation, Entertainment, Education, or Technology
- thumbnail: image URL
- videoUrl: video file URL the browser can access
- description: video description

IMPORTANT LIMITATIONS
This is a front-end starter project, not a complete YouTube-scale service.
- The sample video links are placeholders and currently point to a public sample clip.
- The Create button previews a video from your computer in the current browser session only.
  It does not upload the file to a server or save it in videos.json.
- Likes are saved in this browser's local storage. Subscriptions are visual demo buttons.
- Real accounts, permanent uploads, comments, creator channels, moderation, and a shared
  database require a backend/server and user authentication.
- videos.xml is included as an XML category/feed example. The starter page reads video
  records from videos.json and site settings from site.xml.

This is an independent fan-made demo and is not affiliated with YouTube or Google.
