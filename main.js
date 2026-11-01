// YouTube 2 — Supabase-powered browser frontend.
// Paste your project's URL and anon/public key below after creating your Supabase project.
const SUPABASE_URL = "https://zwikpfyybjogckhvkuut.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_bW3s3u-LsZdWSC0gs_Yjog_sHExNmrm";
const STORAGE_BUCKET = "video-files";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = id => document.getElementById(id);
let videos = [];
let currentVideo = null;
let activeView = "home";
let activeCategory = "All";
let authMode = "signin";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showError(message) {
  $("errorMessage").textContent = message;
  $("errorMessage").classList.remove("hidden");
}
function clearError() { $("errorMessage").classList.add("hidden"); }

async function getSession() {
  if (!db) return null;
  const { data } = await db.auth.getSession();
  return data.session;
}
async function refreshAccountButton() {
  const session = await getSession();
  $("accountOpen").textContent = session ? "Account ▾" : "Sign in";
  $("commentNotice").textContent = session ? "You are signed in. Join the conversation!" : "Sign in to post a comment.";
}
async function loadVideos() {
  clearError();
  if (!db) {
    videos = [];
    renderVideos();
    showError("Connect Supabase to enable shared videos, accounts, uploads, and comments. Follow SUPABASE-SETUP.txt.");
    return;
  }
  const { data, error } = await db.from("videos").select("*").order("created_at", { ascending: false });
  if (error) {
    videos = [];
    renderVideos();
    showError("Couldn't load videos: " + error.message + ". Check your Supabase setup and database policies.");
    return;
  }
  videos = (data || []).map(v => ({
    ...v,
    videoUrl: db.storage.from(STORAGE_BUCKET).getPublicUrl(v.video_path).data.publicUrl,
    thumbnailUrl: v.thumbnail_path ? db.storage.from(STORAGE_BUCKET).getPublicUrl(v.thumbnail_path).data.publicUrl : ""
  }));
  renderVideos();
}
function filteredVideos() {
  const term = $("searchInput").value.trim().toLowerCase();
  return videos.filter(v => {
    const shortMatch = activeView !== "shorts" || v.is_short;
    const categoryMatch = activeCategory === "All" || v.category === activeCategory;
    const searchMatch = [v.title, v.channel_name, v.description, v.category].join(" ").toLowerCase().includes(term);
    return shortMatch && categoryMatch && searchMatch;
  });
}
function renderVideos() {
  const list = filteredVideos();
  $("videoCount").textContent = `${list.length} videos`;
  $("emptyState").classList.toggle("hidden", list.length > 0);
  $("emptyState").textContent = activeView === "shorts" ? "No Shorts yet. Be the first to publish one!" : "No videos yet. Be the first to create one!";
  $("videoGrid").innerHTML = list.map(v => `
    <article class="video-card ${v.is_short ? "short-card" : ""}" data-id="${escapeHTML(v.id)}" tabindex="0" role="button">
      <div class="thumbnail ${v.is_short ? "short-thumbnail" : ""}">
        ${v.thumbnailUrl ? `<img src="${escapeHTML(v.thumbnailUrl)}" alt="" loading="lazy">` : `<div class="thumbnail-placeholder">▶</div>`}
        ${v.is_short ? `<span class="short-label">SHORT</span>` : ""}
      </div>
      <div class="card-info"><div class="card-avatar">${escapeHTML((v.channel_name || "Y").charAt(0).toUpperCase())}</div>
        <div class="card-text"><h3>${escapeHTML(v.title)}</h3><p>${escapeHTML(v.channel_name)}</p><p>${new Date(v.created_at).toLocaleDateString()}</p></div>
      </div>
    </article>`).join("");
  document.querySelectorAll(".video-card").forEach(card => {
    const open = () => openVideo(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
}
async function openVideo(id) {
  const v = videos.find(item => item.id === id);
  if (!v) return;
  currentVideo = v;
  $("homeSection").classList.add("hidden");
  $("categoryRow").classList.add("hidden");
  $("watchSection").classList.remove("hidden");
  $("mainPlayer").src = v.videoUrl;
  $("mainPlayer").poster = v.thumbnailUrl || "";
  $("watchTitle").textContent = v.title;
  $("watchChannel").textContent = v.channel_name;
  $("watchAvatar").textContent = (v.channel_name || "Y").charAt(0).toUpperCase();
  $("watchDate").textContent = new Date(v.created_at).toLocaleDateString();
  $("watchDescription").textContent = v.description || "No description provided.";
  await renderComments();
  $("watchSide").innerHTML = videos.filter(x => x.id !== id && !x.is_short).slice(0, 8).map(x => `
    <div class="side-video" data-id="${escapeHTML(x.id)}">${x.thumbnailUrl ? `<img src="${escapeHTML(x.thumbnailUrl)}" alt="">` : `<div class="side-placeholder">▶</div>`}<strong>${escapeHTML(x.title)}<small>${escapeHTML(x.channel_name)}</small></strong></div>`).join("");
  document.querySelectorAll(".side-video").forEach(el => el.addEventListener("click", () => openVideo(el.dataset.id)));
  window.scrollTo(0, 0);
}
async function renderComments() {
  if (!currentVideo || !db) return;
  const { data, error } = await db.from("comments").select("*").eq("video_id", currentVideo.id).order("created_at", { ascending: false });
  if (error) { $("commentList").textContent = "Comments could not be loaded."; return; }
  $("commentCount").textContent = data.length;
  $("commentList").innerHTML = data.map(c => `<article class="comment"><strong>${escapeHTML(c.display_name || "YouTube 2 user")}</strong><small>${new Date(c.created_at).toLocaleString()}</small><p>${escapeHTML(c.content)}</p></article>`).join("");
}
function goHome() {
  $("mainPlayer").pause();
  $("mainPlayer").removeAttribute("src");
  $("mainPlayer").load();
  currentVideo = null;
  $("watchSection").classList.add("hidden");
  $("homeSection").classList.remove("hidden");
  $("categoryRow").classList.remove("hidden");
  renderVideos();
}
$("backToVideos").addEventListener("click", goHome);
$("brandHome").addEventListener("click", e => { e.preventDefault(); activeView = "home"; activeCategory = "All"; goHome(); });
$("searchForm").addEventListener("submit", e => { e.preventDefault(); goHome(); });
$("searchInput").addEventListener("input", renderVideos);
$("categoryRow").addEventListener("click", e => {
  const chip = e.target.closest("[data-category]");
  if (!chip) return;
  activeCategory = chip.dataset.category;
  document.querySelectorAll(".chip").forEach(x => x.classList.toggle("selected", x === chip));
  renderVideos();
});
document.querySelectorAll(".nav-item[data-view]").forEach(item => item.addEventListener("click", e => {
  e.preventDefault();
  activeView = item.dataset.view;
  $("pageHeading").textContent = activeView === "shorts" ? "YT 2 Shorts" : activeView === "liked" ? "Liked videos" : "Recommended";
  document.querySelectorAll(".nav-item").forEach(x => x.classList.toggle("active", x === item));
  goHome();
  document.body.classList.remove("sidebar-open");
}));
$("menuToggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));

$("accountOpen").addEventListener("click", async () => {
  if (!db) { alert("Set up Supabase first. See SUPABASE-SETUP.txt."); return; }
  const session = await getSession();
  if (session) {
    if (confirm("Sign out of YouTube 2?")) { await db.auth.signOut(); await refreshAccountButton(); }
  } else {
    authMode = "signin"; updateAuthMode(); $("accountDialog").showModal();
  }
});
function updateAuthMode() {
  $("accountHeading").textContent = authMode === "signin" ? "Sign in" : "Create your account";
  $("authSubmit").textContent = authMode === "signin" ? "Sign in" : "Sign up";
  $("authModeToggle").textContent = authMode === "signin" ? "Need an account? Sign up" : "Already registered? Sign in";
  $("authMessage").textContent = "";
}
$("authModeToggle").addEventListener("click", () => { authMode = authMode === "signin" ? "signup" : "signin"; updateAuthMode(); });
$("accountForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!db) return;
  $("authSubmit").disabled = true;
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const result = authMode === "signup"
    ? await db.auth.signUp({ email, password })
    : await db.auth.signInWithPassword({ email, password });
  $("authSubmit").disabled = false;
  if (result.error) { $("authMessage").textContent = result.error.message; return; }
  $("authMessage").textContent = authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "Signed in!";
  if (authMode === "signin" || result.data.session) {
    setTimeout(() => $("accountDialog").close(), 500);
    await refreshAccountButton();
  }
});
$("commentForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!db || !currentVideo) return;
  const session = await getSession();
  if (!session) { $("commentNotice").textContent = "Please sign in before commenting."; return; }
  const content = $("commentInput").value.trim();
  if (!content) return;
  const displayName = session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "YouTube 2 user";
  const { error } = await db.from("comments").insert({ video_id: currentVideo.id, user_id: session.user.id, display_name: displayName, content });
  if (error) { $("commentNotice").textContent = error.message; return; }
  $("commentInput").value = "";
  $("commentNotice").textContent = "";
  await renderComments();
});

$("uploadOpen").addEventListener("click", async () => {
  if (!db) { alert("Connect Supabase first. See SUPABASE-SETUP.txt."); return; }
  if (!(await getSession())) { alert("Please sign in before uploading."); $("accountOpen").click(); return; }
  $("uploadDialog").showModal();
});
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => $(button.dataset.close).close()));
$("uploadForm").addEventListener("submit", async e => {
  e.preventDefault();
  const session = await getSession();
  if (!session) { $("uploadMessage").textContent = "Please sign in first."; return; }
  const file = $("newVideo").files[0];
  const thumb = $("newThumbnail").files[0];
  if (!file) return;
  if (!file.type.startsWith("video/")) { $("uploadMessage").textContent = "Choose a video file."; return; }
  if (file.size > 100 * 1024 * 1024) { $("uploadMessage").textContent = "This starter setup limits uploads to 100 MB. Increase storage limits in Supabase if needed."; return; }
  $("uploadSubmit").disabled = true;
  $("uploadMessage").textContent = "Uploading video…";
  const userId = session.user.id;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const videoPath = `${userId}/${crypto.randomUUID()}-${safeName}`;
  let thumbnailPath = null;
  let uploadError = null;
  const videoUpload = await db.storage.from(STORAGE_BUCKET).upload(videoPath, file, { upsert: false, contentType: file.type });
  if (videoUpload.error) uploadError = videoUpload.error;
  if (!uploadError && thumb) {
    const thumbPath = `${userId}/${crypto.randomUUID()}-${thumb.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const thumbUpload = await db.storage.from(STORAGE_BUCKET).upload(thumbPath, thumb, { upsert: false, contentType: thumb.type });
    if (thumbUpload.error) uploadError = thumbUpload.error;
    else thumbnailPath = thumbPath;
  }
  if (uploadError) {
    $("uploadMessage").textContent = uploadError.message;
    $("uploadSubmit").disabled = false;
    return;
  }
  const { error } = await db.from("videos").insert({
    user_id: userId,
    title: $("newTitle").value.trim(),
    channel_name: $("newChannel").value.trim(),
    description: $("newDescription").value.trim(),
    category: $("newCategory").value,
    is_short: $("newIsShort").checked,
    video_path: videoPath,
    thumbnail_path: thumbnailPath
  });
  $("uploadSubmit").disabled = false;
  if (error) {
    $("uploadMessage").textContent = error.message;
    return;
  }
  $("uploadForm").reset();
  $("uploadDialog").close();
  activeView = "home"; activeCategory = "All"; $("searchInput").value = "";
  $("pageHeading").textContent = "Recommended";
  await loadVideos();
  goHome();
});

document.querySelectorAll(".chip").forEach(chip => chip.addEventListener("click", () => {}));
if (db) {
  db.auth.onAuthStateChange(() => { refreshAccountButton(); });
  refreshAccountButton();
}
loadVideos();
