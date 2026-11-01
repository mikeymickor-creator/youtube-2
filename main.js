const grid = document.getElementById("videoGrid");
const searchInput = document.getElementById("searchInput");
const watchSection = document.getElementById("watchSection");
const homeSection = document.getElementById("homeSection");
const player = document.getElementById("mainPlayer");
let videos = [];
let activeCategory = "All";
let currentVideo = null;
let temporaryVideoUrls = [];

async function loadSiteSettings() {
  try {
    const response = await fetch("site.xml");
    if (!response.ok) throw new Error("Could not load site.xml");
    const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
    const name = xml.querySelector("site > name")?.textContent?.trim();
    if (name) {
      document.title = name;
      document.querySelector(".brand").innerHTML = `<span class="brand-mark">▶</span><span>${escapeHTML(name)}</span>`;
    }
  } catch (error) {
    console.info("Using default site settings.", error);
  }
}

async function loadVideos() {
  try {
    const response = await fetch("videos.json");
    if (!response.ok) throw new Error("Could not load videos.json");
    const data = await response.json();
    videos = Array.isArray(data.videos) ? data.videos : [];
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">Couldn't load videos.json. Start the site with a local web server (see README.txt).</p>`;
    console.error(error);
    return;
  }
  renderVideos();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function filteredVideos() {
  const term = searchInput.value.trim().toLowerCase();
  return videos.filter(video => {
    const matchesTerm = [video.title, video.channel, video.category].join(" ").toLowerCase().includes(term);
    const matchesCategory = activeCategory === "All" || video.category === activeCategory;
    return matchesTerm && matchesCategory;
  });
}

function renderVideos() {
  const list = filteredVideos();
  document.getElementById("videoCount").textContent = `${list.length} videos`;
  document.getElementById("emptyState").classList.toggle("hidden", list.length !== 0);
  grid.innerHTML = list.map(video => `
    <article class="video-card" data-id="${escapeHTML(video.id)}" tabindex="0" role="button" aria-label="Watch ${escapeHTML(video.title)}">
      <div class="thumbnail">
        <img src="${escapeHTML(video.thumbnail)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="duration">${escapeHTML(video.duration || "")}</span>
      </div>
      <div class="card-info">
        <div class="card-avatar">${escapeHTML((video.channel || "C").charAt(0).toUpperCase())}</div>
        <div class="card-text">
          <h3>${escapeHTML(video.title)}</h3>
          <p>${escapeHTML(video.channel)}</p>
          <p>${escapeHTML(video.views || "0 views")} · ${escapeHTML(video.age || "Recently")}</p>
        </div>
      </div>
    </article>`).join("");
  grid.querySelectorAll(".video-card").forEach(card => {
    const open = () => openVideo(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  });
}

function openVideo(id) {
  const video = videos.find(item => item.id === id);
  if (!video) return;
  currentVideo = video;
  homeSection.classList.add("hidden");
  watchSection.classList.remove("hidden");
  player.pause();
  player.src = video.videoUrl;
  player.poster = video.thumbnail || "";
  document.getElementById("watchTitle").textContent = video.title;
  document.getElementById("watchChannel").textContent = video.channel;
  document.getElementById("watchSubscribers").textContent = video.subscribers || "Creator";
  document.getElementById("watchAvatar").textContent = (video.channel || "C").charAt(0).toUpperCase();
  document.getElementById("watchDescription").textContent = video.description || "No description provided.";
  const liked = getLikes().includes(video.id);
  updateLikeButton(liked);
  document.getElementById("subscribeButton").classList.remove("subscribed");
  document.getElementById("subscribeButton").textContent = "Subscribe";
  renderWatchSide(video.id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderWatchSide(currentId) {
  document.getElementById("watchSide").innerHTML = videos.filter(v => v.id !== currentId).map(v => `
    <div class="side-video" data-id="${escapeHTML(v.id)}">
      <img src="${escapeHTML(v.thumbnail)}" alt="">
      <div><strong>${escapeHTML(v.title)}</strong><small>${escapeHTML(v.channel)}<br>${escapeHTML(v.views || "")}</small></div>
    </div>`).join("");
  document.querySelectorAll(".side-video").forEach(item => item.addEventListener("click", () => openVideo(item.dataset.id)));
}

function getLikes() {
  try { return JSON.parse(localStorage.getItem("yt2-liked") || "[]"); }
  catch { return []; }
}
function updateLikeButton(liked) {
  const button = document.getElementById("watchLike");
  button.classList.toggle("liked", liked);
  button.innerHTML = `${liked ? "♥" : "♡"} <span>${liked ? "Liked" : "Like"}</span>`;
}
document.getElementById("watchLike").addEventListener("click", () => {
  if (!currentVideo) return;
  let likes = getLikes();
  likes = likes.includes(currentVideo.id) ? likes.filter(id => id !== currentVideo.id) : [...likes, currentVideo.id];
  localStorage.setItem("yt2-liked", JSON.stringify(likes));
  updateLikeButton(likes.includes(currentVideo.id));
});

document.getElementById("subscribeButton").addEventListener("click", event => {
  const button = event.currentTarget;
  const subscribed = button.classList.toggle("subscribed");
  button.textContent = subscribed ? "Subscribed ✓" : "Subscribe";
});
document.getElementById("backToVideos").addEventListener("click", () => {
  player.pause();
  player.removeAttribute("src");
  player.load();
  watchSection.classList.add("hidden");
  homeSection.classList.remove("hidden");
});
document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  watchSection.classList.add("hidden");
  homeSection.classList.remove("hidden");
  renderVideos();
});
searchInput.addEventListener("input", renderVideos);
document.getElementById("categoryRow").addEventListener("click", event => {
  const chip = event.target.closest("[data-category]");
  if (!chip) return;
  activeCategory = chip.dataset.category;
  document.querySelectorAll(".chip").forEach(item => item.classList.toggle("selected", item === chip));
  renderVideos();
});
document.querySelectorAll(".nav-item[data-filter]").forEach(item => item.addEventListener("click", event => {
  event.preventDefault();
  const filter = item.dataset.filter;
  if (filter === "Liked videos") {
    const liked = getLikes();
    activeCategory = "All";
    searchInput.value = "";
    videos = [...videos].sort((a, b) => Number(liked.includes(b.id)) - Number(liked.includes(a.id)));
  } else {
    activeCategory = "All";
    searchInput.value = "";
    loadVideos();
  }
  document.querySelectorAll(".nav-item").forEach(nav => nav.classList.toggle("active", nav === item));
  renderVideos();
  document.body.classList.remove("sidebar-open");
}));
document.getElementById("menuToggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
document.getElementById("brandHome").addEventListener("click", event => {
  event.preventDefault();
  document.getElementById("backToVideos").click();
  activeCategory = "All";
  searchInput.value = "";
  renderVideos();
});

const uploadDialog = document.getElementById("uploadDialog");
document.getElementById("uploadOpen").addEventListener("click", () => uploadDialog.showModal());
document.getElementById("uploadClose").addEventListener("click", () => uploadDialog.close());
document.getElementById("uploadCancel").addEventListener("click", () => uploadDialog.close());
document.getElementById("uploadForm").addEventListener("submit", event => {
  event.preventDefault();
  const videoFile = document.getElementById("newVideo").files[0];
  const thumbnailFile = document.getElementById("newThumbnail").files[0];
  if (!videoFile) return;
  const videoUrl = URL.createObjectURL(videoFile);
  temporaryVideoUrls.push(videoUrl);
  let thumbnail = "";
  if (thumbnailFile) {
    thumbnail = URL.createObjectURL(thumbnailFile);
    temporaryVideoUrls.push(thumbnail);
  }
  const title = document.getElementById("newTitle").value.trim();
  const channel = document.getElementById("newChannel").value.trim();
  const category = document.getElementById("newCategory").value;
  videos.unshift({
    id: `local-${Date.now()}`, title, channel, category, views: "0 views", age: "Just now",
    duration: "", description: "Added locally in this browser session.", thumbnail,
    videoUrl, subscribers: "Your channel"
  });
  activeCategory = "All";
  searchInput.value = "";
  document.querySelectorAll(".chip").forEach(chip => chip.classList.toggle("selected", chip.dataset.category === "All"));
  renderVideos();
  uploadDialog.close();
  event.target.reset();
});
window.addEventListener("beforeunload", () => temporaryVideoUrls.forEach(URL.revokeObjectURL));

loadSiteSettings();
loadVideos();
