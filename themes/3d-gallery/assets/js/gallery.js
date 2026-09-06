const toggles = document.querySelectorAll("[data-panel-toggle]");
const panels = document.querySelectorAll("[data-panel]");

function closePanels(except) {
  document.querySelector(".gallery-stage")?.classList.toggle("is-explore-open", except === "explore");
  panels.forEach((panel) => {
    if (panel.dataset.panel !== except) {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
    }
  });
  toggles.forEach((toggle) => {
    if (toggle.dataset.panelToggle !== except) {
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

toggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const name = toggle.dataset.panelToggle;
    const panel = document.querySelector(`[data-panel="${name}"]`);
    const next = toggle.getAttribute("aria-expanded") !== "true";
    closePanels(name);
    toggle.setAttribute("aria-expanded", String(next));
    panel?.classList.toggle("is-open", next);
    panel?.setAttribute("aria-hidden", String(!next));
    document.querySelector(".gallery-stage")?.classList.toggle("is-explore-open", name === "explore" && next);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePanels();
});

const mount = document.querySelector("[data-gallery]");
const fallback = document.querySelector("[data-gallery-fallback]");
const caption = document.querySelector("[data-gallery-caption]");
const scrollbar = document.querySelector("[data-gallery-scrollbar]");
const projects = [...document.querySelectorAll("[data-project]")].map((card) => ({
  title: card.dataset.title || card.querySelector("strong")?.textContent || "Untitled",
  url: card.getAttribute("href") || "",
  category: card.dataset.category || card.querySelector("em")?.textContent || "Project",
  image: card.dataset.image || card.querySelector("img")?.getAttribute("src") || "",
  color: card.dataset.color || "#d8d5ce",
}));
const useThreeCDN = mount?.dataset.threeCdnEnabled === "true";
const threeCDN = mount?.dataset.threeCdn || "https://esm.sh/three@0.168.0";

if (mount && projects.length && useThreeCDN) {
  initGallery().catch(() => {
    initDomGallery();
  });
} else {
  initDomGallery();
}

function setCaption(title, category) {
  if (!caption) return;
  caption.replaceChildren(
    Object.assign(document.createElement("p"), { textContent: title }),
    Object.assign(document.createElement("p"), { textContent: category || "Project" }),
  );
  caption.classList.add("is-visible");
  window.clearTimeout(caption.hideTimer);
  caption.hideTimer = window.setTimeout(() => caption.classList.remove("is-visible"), 1600);
}

function initDomGallery() {
  if (!fallback) return;

  const cards = [...fallback.querySelectorAll("[data-project]")];
  fallback.classList.add("is-visible", "is-scrollable");
  const preview = document.createElement("a");
  preview.className = "gallery-preview";
  preview.setAttribute("aria-hidden", "true");
  fallback.after(preview);

  let target = 0;
  let current = 0;
  let max = 0;
  let trackWidth = 0;
  let dragStart = 0;
  let startTarget = 0;
  let dragDistance = 0;
  let isDragging = false;
  let activeIndex = -1;

  function showPreview(card) {
    if (!card) return;
    const title = card.dataset.title || "Untitled";
    const category = card.dataset.category || "Project";
    const image = card.dataset.image || "";
    const color = card.dataset.color || "#d8d5ce";

    preview.href = card.getAttribute("href") || "#";
    preview.setAttribute("aria-label", title);
    preview.classList.add("is-visible");
    preview.removeAttribute("aria-hidden");
    const previewMedia = image
      ? Object.assign(document.createElement("img"), { src: image, alt: title })
      : Object.assign(document.createElement("span"), { className: "project-poster" });
    preview.replaceChildren(previewMedia);
    preview.firstElementChild?.style.setProperty("--poster", color);
  }

  function measure() {
    const stageWidth = fallback.parentElement?.clientWidth || window.innerWidth;
    const stageHeight = fallback.parentElement?.clientHeight || window.innerHeight;
    const rows = stageWidth < 760 ? 8 : 3;
    const cellX = stageWidth < 760 ? 92 : 98;
    const rowGap = stageWidth < 760 ? 68 : 112;
    const top = stageWidth < 760 ? 42 : 42;
    const startX = stageWidth < 760 ? 10 : 18;
    trackWidth = Math.max(stageWidth * 2.4, startX + Math.ceil(cards.length / rows) * cellX + stageWidth * 0.7);
    fallback.style.setProperty("--gallery-width", `${trackWidth}px`);

    cards.forEach((card, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const jitterX = ((index * 37) % 28) - 14;
      const jitterY = ((index * 53) % 26) - 13;
      const img = card.querySelector("img");
      const naturalRatio = img?.naturalWidth && img?.naturalHeight ? img.naturalWidth / img.naturalHeight : null;
      const ratio = naturalRatio || [0.68, 1, 1.38, 0.78, 1.18][index % 5];
      const h = [48, 54, 62, 70, 44, 58][index % 6];
      const w = Math.round(h * ratio);
      const x = startX + column * cellX + jitterX;
      const y = Math.min(stageHeight - 90, top + row * rowGap + jitterY);

      card.style.setProperty("--card-x", `${x}px`);
      card.style.setProperty("--card-y", `${y}px`);
      card.style.setProperty("--card-w", `${w}px`);
      card.style.setProperty("--card-h", `${h}px`);
      card.style.setProperty("--project-index", index);
      card.style.setProperty("--explore-y", `${42 + index * 67}px`);
    });

    max = Math.max(0, trackWidth - stageWidth);
    target = Math.min(Math.max(target, -max), 0);

    if (activeIndex < 0 && cards.length) {
      activeIndex = Math.min(12, cards.length - 1);
      showPreview(cards[activeIndex]);
    }
  }

  function updateScrollbar() {
    if (!scrollbar) return;
    const progress = max ? Math.abs(current) / max : 0;
    scrollbar.style.transform = `translateX(${progress * Math.max(0, window.innerWidth - 48)}px)`;
  }

  function animate(time) {
    current += (target - current) * 0.09;
    fallback.style.setProperty("--gallery-x", `${current}px`);

    cards.forEach((card, index) => {
      const y = Math.sin(time * 0.001 + index * 0.85) * 5;
      card.style.setProperty("--float-y", `${y}px`);
    });

    updateScrollbar();
    requestAnimationFrame(animate);
  }

  cards.forEach((card) => {
    card.addEventListener("pointerenter", () => {
      activeIndex = cards.indexOf(card);
      showPreview(card);
    });
  });

  fallback.addEventListener("pointerdown", (event) => {
    isDragging = true;
    dragStart = event.clientX;
    startTarget = target;
    dragDistance = 0;
    fallback.setPointerCapture(event.pointerId);
  });

  fallback.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - dragStart;
    dragDistance = Math.max(dragDistance, Math.abs(delta));
    target = Math.min(Math.max(startTarget + delta, -max), 0);
  });

  fallback.addEventListener("pointerup", (event) => {
    isDragging = false;
    fallback.releasePointerCapture(event.pointerId);
  });

  fallback.addEventListener("click", (event) => {
    if (dragDistance > 6) {
      event.preventDefault();
    }
  }, true);

  window.addEventListener("wheel", (event) => {
    if (!fallback.classList.contains("is-scrollable")) return;
    target = Math.min(Math.max(target - event.deltaY * 0.85 - event.deltaX, -max), 0);

    if (cards.length) {
      const progress = max ? Math.abs(target) / max : 0;
      const nextIndex = Math.min(cards.length - 1, Math.max(0, Math.round(progress * (cards.length - 1))));
      if (nextIndex !== activeIndex) {
        activeIndex = nextIndex;
        showPreview(cards[activeIndex]);
      }
    }
  }, { passive: true });

  window.addEventListener("resize", measure);
  measure();
  requestAnimationFrame(animate);
}

async function initGallery() {
  const THREE = await import(threeCDN);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.3, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  const group = new THREE.Group();
  scene.add(group);

  const loader = new THREE.TextureLoader();
  const geometry = new THREE.PlaneGeometry(1.35, 1.85, 12, 12);
  const cards = projects.map((project, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(project.color || "#d8d5ce"),
      side: THREE.DoubleSide,
    });

    if (project.image) {
      loader.load(project.image, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.color = new THREE.Color(0xffffff);
        material.needsUpdate = true;
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    const col = index % 4;
    const row = Math.floor(index / 4);
    const baseY = (0.5 - row) * 2.2;
    mesh.position.set((col - 1.5) * 1.8, baseY, -Math.abs(col - 1.5) * 0.18);
    mesh.rotation.y = (col - 1.5) * -0.12;
    mesh.userData = { ...project, baseY };
    group.add(mesh);
    return mesh;
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let targetX = 0;
  let targetY = 0;
  let active = null;
  let dragStart = 0;
  let dragDistance = 0;
  let scroll = 0;
  let isDragging = false;

  function resize() {
    const { width, height } = mount.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function setPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    targetX = pointer.x;
    targetY = pointer.y;
  }

  function updateHover() {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(cards, false)[0]?.object || null;
    if (hit !== active) {
      active = hit;
      if (caption && active) {
        setCaption(active.userData.title, active.userData.category || "Project");
      }
    }
  }

  renderer.domElement.addEventListener("pointermove", (event) => {
    setPointer(event);
    if (isDragging) {
      const delta = event.clientX - dragStart;
      dragDistance += Math.abs(delta);
      scroll += delta * 0.003;
      dragStart = event.clientX;
    }
    updateHover();
  });

  renderer.domElement.addEventListener("pointerdown", (event) => {
    isDragging = true;
    dragStart = event.clientX;
    dragDistance = 0;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    isDragging = false;
    renderer.domElement.releasePointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("click", () => {
    if (active?.userData?.url && dragDistance < 6) {
      window.location.href = active.userData.url;
    }
  });

  window.addEventListener("wheel", (event) => {
    scroll += event.deltaY * -0.0018;
  }, { passive: true });

  window.addEventListener("resize", resize);
  resize();
  mount.classList.add("is-ready");

  function animate(time) {
    const width = Math.max(1, Math.ceil(projects.length / 2));
    group.position.x += (scroll - group.position.x) * 0.08;
    group.rotation.y += (targetX * 0.08 - group.rotation.y) * 0.06;
    group.rotation.x += (-targetY * 0.04 - group.rotation.x) * 0.06;

    cards.forEach((card, index) => {
      const floatY = card.userData.baseY + Math.sin(time * 0.0008 + index) * 0.035;
      card.position.y += (floatY - card.position.y) * 0.08;
      card.scale.setScalar(card === active ? 1.045 : 1);
    });

    if (scrollbar) {
      const progress = (((-group.position.x / width) % 1) + 1) % 1;
      scrollbar.style.transform = `translateX(${progress * Math.max(0, window.innerWidth - 48)}px)`;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
