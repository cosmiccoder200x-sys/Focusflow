// ===== LockIn — blocked.js =====

// Matrix rain background
const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");

const CHARS = "アイウエオカキクケコサシスセソタチツテトナ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FONT_SIZE = 13;
let cols, drops;

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  cols  = Math.floor(canvas.width / FONT_SIZE);
  drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -canvas.height / FONT_SIZE));
}

resize();
window.addEventListener("resize", resize);

function drawMatrix() {
  ctx.fillStyle = "rgba(17, 17, 19, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = FONT_SIZE + "px monospace";

  for (let i = 0; i < cols; i++) {
    const char = CHARS[Math.floor(Math.random() * CHARS.length)];
    const x = i * FONT_SIZE;
    const y = drops[i] * FONT_SIZE;
    if (drops[i] >= 0) {
      ctx.fillStyle = "#c9a84c";
      ctx.shadowColor = "#c9a84c";
      ctx.shadowBlur = 4;
      ctx.fillText(char, x, y);
    }
    if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
}

setInterval(drawMatrix, 50);

// Show pending tasks
async function loadPendingTasks() {
  try {
    const r = await chrome.storage.local.get("tasks");
    const tasks = (r.tasks || []).filter(t => !t.done).slice(0, 5);
    const list = document.getElementById("warnTaskList");
    const wrap = document.getElementById("warnTasks");
    if (!list || !tasks.length) { if (wrap) wrap.style.display = "none"; return; }
    list.innerHTML = tasks.map(t => `<li class="warn-task-item">${t.text}</li>`).join("");
  } catch {}
}

loadPendingTasks();
