const toggles = document.querySelectorAll("[data-panel-toggle]");
const panels = document.querySelectorAll("[data-panel]");

function closePanels(except) {
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
    fallback?.classList.add("is-visible");
  });
} else {
  fallback?.classList.add("is-visible");
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
        caption.replaceChildren(
          Object.assign(document.createElement("p"), { textContent: active.userData.title }),
          Object.assign(document.createElement("p"), { textContent: active.userData.category || "Project" }),
        );
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
      scrollbar.style.transform = `translateX(${progress * 92}vw)`;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
