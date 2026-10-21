console.log("Welcome to Saurabh Kumar's Portfolio!");

/* ================= THEME TOGGLE ================= */
(function () {
    const root = document.documentElement;
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) {}
        window.dispatchEvent(new Event("themechange"));
    });
})();

/* ================= LIVE TIME (IST) ================= */
function updateTime() {
    const el = document.getElementById("current-time");
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}
updateTime();
setInterval(updateTime, 1000);

/* ================= COPY EMAIL ================= */
function copyEmail(e) {
    const btn = e.currentTarget;
    navigator.clipboard.writeText("kumarsaurabh7449@gmail.com").then(() => {
        const old = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => (btn.innerHTML = old), 1500);
    });
}

/* ================= ROTATING DOTTED GLOBE ================= */
(function initGlobe() {
    const canvas = document.getElementById("globe");
    if (!canvas || typeof THREE === "undefined") return;

    const area = canvas.parentElement;
    const pin = area.querySelector(".location-pin");

    // Greater Noida
    const HOME = { lat: 28.47, lon: 77.5 };
    const R = 1;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    const tilt = new THREE.Group();   // fixed tilt
    const spin = new THREE.Group();   // rotates
    tilt.add(spin);
    scene.add(tilt);
    tilt.rotation.x = HOME.lat * Math.PI / 180 * 0.6;
    spin.rotation.y = (-90 - HOME.lon) * Math.PI / 180;

    // lat/lon -> 3D (matches three.js sphere UV layout)
    function toVec(lat, lon, r) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        return new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
             r * Math.cos(phi),
             r * Math.sin(phi) * Math.sin(theta)
        );
    }

    // base sphere (hides back-side dots)
    const baseMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f2 });
    spin.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 64), baseMat));

    // soft outline
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.BackSide });
    const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 64), rimMat);
    spin.add(rim);

    // home marker
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), markerMat);
    marker.position.copy(toVec(HOME.lat, HOME.lon, R * 1.01));
    spin.add(marker);

    // theme colours
    let dotMat = null;
    function applyTheme() {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        baseMat.color.set(dark ? 0x1a1a1a : 0xf4f4f2);
        rimMat.color.set(dark ? 0x333333 : 0xdddddd);
        markerMat.color.set(dark ? 0xffffff : 0x111111);
        if (dotMat) dotMat.color.set(dark ? 0xe6e6e6 : 0x222222);
    }
    window.addEventListener("themechange", applyTheme);
    applyTheme();

    // build dots from a land mask image
    function buildDots(isLand) {
        const pts = [];
        const step = 2.0; // degrees; smaller = denser
        for (let lat = -88; lat <= 88; lat += step) {
            const n = Math.max(1, Math.round(360 * Math.cos(lat * Math.PI / 180) / step));
            for (let i = 0; i < n; i++) {
                const lon = -180 + (i + 0.5) * (360 / n);
                if (isLand(lat, lon)) pts.push(toVec(lat, lon, R));
            }
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        dotMat = new THREE.PointsMaterial({ color: 0x222222, size: 0.017, sizeAttenuation: true });
        spin.add(new THREE.Points(geo, dotMat));
        applyTheme();
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        buildDots((lat, lon) => {
            const x = Math.floor(((lon + 180) / 360) * (c.width - 1));
            const y = Math.floor(((90 - lat) / 180) * (c.height - 1));
            return data[(y * c.width + x) * 4] < 100; // dark = land
        });
    };
    img.onerror = () => buildDots(() => true); // fallback: full dotted sphere
    img.src = "https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-water.png";

    // resize
    function resize() {
        const w = area.clientWidth, h = area.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const fit = Math.min(1, camera.aspect);
        camera.position.set(0, 0, 1.08 / Math.tan(15 * Math.PI / 180) / fit);
        camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(area);
    resize();

    // drag to rotate
    let dragging = false, lastX = 0;
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
    canvas.addEventListener("pointermove", e => { if (!dragging) return; spin.rotation.y += (e.clientX - lastX) * 0.006; lastX = e.clientX; });
    const stop = () => { dragging = false; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);

    // animate
    const v = new THREE.Vector3();
    function animate() {
        requestAnimationFrame(animate);
        if (!dragging) spin.rotation.y += 0.0022;
        renderer.render(scene, camera);

        // keep the HTML location pill attached to the marker
        if (pin) {
            marker.getWorldPosition(v);
            const facing = v.z > 0.15 * R;
            v.project(camera);
            pin.style.left = ((v.x * 0.5 + 0.5) * area.clientWidth) + "px";
            pin.style.top = ((-v.y * 0.5 + 0.5) * area.clientHeight) + "px";
            pin.style.opacity = facing ? 1 : 0;
        }
    }
    animate();
})();
