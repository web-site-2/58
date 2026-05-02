"use strict";

const PASSWORD = "2023/5/15";
const RELATION_START = new Date("2023-05-15T00:00:00");

const gate = document.getElementById("gate");
const app = document.getElementById("app");
const passwordForm = document.getElementById("password-form");
const passwordInput = document.getElementById("password-input");
const passwordError = document.getElementById("password-error");
const audio = document.getElementById("romantic-audio");
const heartsCanvas = document.getElementById("hearts-canvas");
const replayHeartsButton = document.getElementById("replay-hearts");
const showMemoriesAgainButton = document.getElementById("show-memories-again");

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const weeksEl = document.getElementById("weeks");
const remainingDaysEl = document.getElementById("remaining-days");
const totalHoursEl = document.getElementById("total-hours");

const scenes = Array.from(document.querySelectorAll(".scene"));
const typingElements = Array.from(document.querySelectorAll(".typing"));
const nextButtons = Array.from(document.querySelectorAll(".next-btn"));

let heartsBurstPower = 0;
/** Full-viewport explosion: skip safe-zone culling + heavy shower (ms timestamp when it ends). */
let heartExplosionUntil = 0;
/** After explosion, ambient + new hearts render in a richer red. */
let heartsPreferRedTint = false;

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const now = new Date();
  const diffMs = Math.max(0, now - RELATION_START);

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  const totalHours = Math.floor(totalSeconds / 3600);

  daysEl.textContent = String(days);
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
  secondsEl.textContent = pad(seconds);
  weeksEl.textContent = String(weeks);
  remainingDaysEl.textContent = String(remainingDays);
  totalHoursEl.textContent = String(totalHours);
}

function setMusicState(enabled) {
  if (!audio) {
    return;
  }
  audio.dataset.playing = enabled ? "true" : "false";
}

async function tryPlayMusic() {
  if (!audio) {
    return;
  }
  try {
    audio.volume = 0.4;
    await audio.play();
    setMusicState(true);
  } catch (error) {
    setMusicState(false);
  }
}

function activateScene(id) {
  scenes.forEach((scene) => {
    scene.classList.remove("active");
    if (scene.id === id) {
      scene.classList.add("active");
      scene.classList.remove("hidden");
    } else {
      scene.classList.add("hidden");
    }
  });

  const typing = document.querySelector(`#${id} .typing`);
  if (typing && !typing.dataset.done) {
    typeText(typing, typing.dataset.text || "", 38);
  }
}

function typeText(element, text, speed) {
  element.textContent = "";
  element.classList.remove("done");
  element.dataset.done = "true";
  let index = 0;
  const timer = setInterval(() => {
    element.textContent += text.charAt(index);
    index += 1;
    if (index >= text.length) {
      clearInterval(timer);
      element.classList.add("done");
    }
  }, speed);
}

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = passwordInput.value.trim();
  if (value !== PASSWORD) {
    passwordError.textContent = "كلمة السر غير صحيحة... حاولي مرة أخرى";
    return;
  }

  passwordError.textContent = "";
  gate.classList.remove("screen-visible");
  app.classList.add("screen-visible");
  activateScene("countdown-scene");
  updateCountdown();
});

nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextId = button.dataset.next;
    if (!nextId) {
      return;
    }

    heartsBurstPower = Math.max(heartsBurstPower, 0.8);
    activateScene(nextId);
  });
});

replayHeartsButton.addEventListener("click", () => {
  heartsBurstPower = 2.2;
  heartsPreferRedTint = true;
  heartExplosionUntil = Date.now() + 14000;
  document.body.classList.add("heart-explosion-on");
  if (typeof window.triggerHeartShower === "function") {
    window.triggerHeartShower(340);
  }
});

function initHearts() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !heartsCanvas) {
    return;
  }

  const ctx = heartsCanvas.getContext("2d");
  if (!ctx) {
    return;
  }

  let width = 0;
  let height = 0;
  const hearts = [];
  const baseCount = Math.min(40, Math.max(18, Math.floor(window.innerWidth / 32)));

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    heartsCanvas.width = Math.floor(width * dpr);
    heartsCanvas.height = Math.floor(height * dpr);
    heartsCanvas.style.width = `${width}px`;
    heartsCanvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createHeart(fromBottom = false) {
    return {
      x: Math.random() * width,
      y: fromBottom ? height + 24 : Math.random() * height,
      size: 7 + Math.random() * 11,
      speedY: 0.45 + Math.random() * 1.05,
      sway: Math.random() * Math.PI * 2,
      opacity: 0.18 + Math.random() * 0.45,
      mode: "ambient"
    };
  }

  function createShowerHeart(fullWidth = false) {
    const centerX = width * 0.5;
    const spread = fullWidth ? width * 0.98 : width * 0.34;
    return {
      x: centerX + (Math.random() * spread - spread / 2),
      y: fullWidth ? -30 - Math.random() * Math.min(height * 1.4, 900) : -20 - Math.random() * 40,
      size: fullWidth ? 9 + Math.random() * 18 : 8 + Math.random() * 14,
      speedY: fullWidth ? 2 + Math.random() * 4.5 : 1.8 + Math.random() * 2.4,
      sway: Math.random() * Math.PI * 2,
      opacity: fullWidth ? 0.5 + Math.random() * 0.45 : 0.45 + Math.random() * 0.4,
      mode: "shower"
    };
  }

  function drawHeart(heart) {
    const exploding = Date.now() < heartExplosionUntil;
    const safeXStart = width * 0.27;
    const safeXEnd = width * 0.73;
    const safeYStart = height * 0.2;
    const safeYEnd = height * 0.82;
    const isInSafeZone =
      heart.x > safeXStart &&
      heart.x < safeXEnd &&
      heart.y > safeYStart &&
      heart.y < safeYEnd;
    if (!exploding && isInSafeZone) {
      return;
    }
    ctx.save();
    ctx.translate(heart.x, heart.y);
    ctx.scale(heart.size / 18, heart.size / 18);
    const useRed = exploding || heartsPreferRedTint || heart.mode === "shower";
    const fill = useRed ? `rgba(220, 38, 70, ${heart.opacity})` : `rgba(213, 36, 99, ${heart.opacity})`;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(0, -4, -10, -4, -10, 4);
    ctx.bezierCurveTo(-10, 12, 0, 16, 0, 20);
    ctx.bezierCurveTo(0, 16, 10, 12, 10, 4);
    ctx.bezierCurveTo(10, -4, 0, -4, 0, 4);
    ctx.fill();
    ctx.restore();
  }

  resizeCanvas();
  for (let i = 0; i < baseCount; i += 1) {
    hearts.push(createHeart(false));
  }

  window.triggerHeartShower = (amount = 42) => {
    const exploding = Date.now() < heartExplosionUntil || amount > 200;
    const cap = exploding ? Math.min(amount, 480) : Math.min(120, amount);
    const showerCount = Math.max(exploding ? 80 : 20, cap);
    for (let i = 0; i < showerCount; i += 1) {
      hearts.push(createShowerHeart(exploding));
    }
  };

  function animate() {
    ctx.clearRect(0, 0, width, height);
    heartsBurstPower *= 0.97;
    const explodingNow = Date.now() < heartExplosionUntil;
    if (!explodingNow) {
      document.body.classList.remove("heart-explosion-on");
    } else if (hearts.length < 480 && Math.random() < 0.065) {
      hearts.push(createShowerHeart(true));
    }
    for (let i = hearts.length - 1; i >= 0; i -= 1) {
      const heart = hearts[i];
      const burstBoost = 1 + heartsBurstPower;
      if (heart.mode === "shower") {
        heart.y += heart.speedY * burstBoost;
      } else {
        heart.y -= heart.speedY * burstBoost;
      }
      heart.sway += 0.02;
      heart.x += Math.sin(heart.sway) * 0.3 * burstBoost;
      if (heart.mode === "shower" && heart.y > height + 28) {
        hearts.splice(i, 1);
        continue;
      }
      if (heart.mode === "ambient" && heart.y < -25) {
        Object.assign(heart, createHeart(true));
      }
      drawHeart(heart);
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
  window.addEventListener("resize", resizeCanvas, { passive: true });
}

if (showMemoriesAgainButton) {
  showMemoriesAgainButton.addEventListener("click", () => {
    activateScene("gallery");
  });
}

typingElements.forEach((item) => {
  item.textContent = "";
});

setMusicState(false);
initHearts();
setInterval(updateCountdown, 1000);
