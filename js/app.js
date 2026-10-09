(() => {
  "use strict";

  // ===== SET THESE VALUES BEFORE PUBLISHING =====
  const CONFIG = {
    // Your existing Apps Script verification endpoint:
    verifyApi: "https://script.google.com/macros/s/AKfycbxejo41XCZAECqxPviHVpiZnLdcLAEmVxEQ4utRRP47NAlol24sWuCbJjxeCVXMcOT3ng/exec",
    // Paste your actual tutorial video URL here:
    tutorialUrl: "https://www.youtube.com/",
    youtubeUrl: "https://www.youtube.com/@ViveXhere",
    instagramUrl: "https://www.instagram.com/its.vivexhere/",
    // Paste your Google Form URL here:
    googleFormUrl: "",
    // Paste your UPI ID here:
    upiId: "deadlyvivek018@okhdfcbank",
    // If you have a payment QR image, put it in assets and set this to its path, e.g. "assets/payment-qr.png":
    qrImagePath: "assets/qr.png": ""
  };

  const BRANDS = [
    "Samsung", "Realme", "Vivo", "OPPO", "Xiaomi", "Redmi", "OnePlus",
    "Motorola", "Infinix", "Tecno", "iQOO", "Apple", "POCO", "Nothing",
    "Honor", "Google Pixel"
  ];

  const BRAND_FACTOR = {
    "Samsung": 0, "Realme": 2, "Vivo": 2, "OPPO": 1, "Xiaomi": 3,
    "Redmi": 3, "OnePlus": 4, "Motorola": 0, "Infinix": 3, "Tecno": 3,
    "iQOO": 5, "Apple": -3, "POCO": 4, "Nothing": 1, "Honor": 1,
    "Google Pixel": -2
  };

  const state = {
    brand: "POCO",
    ram: 4,
    storage: 128,
    density: null,
    screenWidth: 0,
    screenHeight: 0,
    dpr: 1,
    scanned: false,
    lastPage: "tab-sensi",
    dropdownValues: { brand: "POCO", ram: "4", storage: "128" },
    ramChosen: false,
    storageChosen: false
  };

  const $ = (id) => document.getElementById(id);
  const views = Array.from(document.querySelectorAll(".view"));
  const navItems = Array.from(document.querySelectorAll(".nav-item"));
  const innerPages = new Set([
    "page-verify", "page-device", "page-scan", "page-results",
    "page-loading", "page-boost", "page-payment-form", "page-payment-done"
  ]);
  const pageStack = [];

  function showView(id, push = true) {
    const current = views.find(v => v.classList.contains("active"));
    if (current && current.id !== id && push) pageStack.push(current.id);
    views.forEach(v => v.classList.toggle("active", v.id === id));
    const tabId = id.startsWith("tab-") ? id : null;
    navItems.forEach(btn => btn.classList.toggle("active", tabId === `tab-${btn.dataset.tab}`));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function back() {
    const previous = pageStack.pop();
    if (previous) showView(previous, false);
    else showView("tab-sensi", false);
  }

  function goTab(tab) {
    pageStack.length = 0;
    showView(`tab-${tab}`, false);
  }

  function getDeviceId() {
    // Clearing browser data removes this ID by design; the warning explains that access may be lost.
    let id = "";
    try { id = localStorage.getItem("vivex_device_id") || ""; } catch (_) {}
    if (!id) {
      id = "vx-" + makeRandomId();
      try { localStorage.setItem("vivex_device_id", id); } catch (_) {}
    }
    return id;
  }

  function makeRandomId() {
    const bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }

  function getRamEffect(ram) {
    const effects = { 4: 5, 6: 3, 8: 1, 12: -1, 16: -3, 24: -5 };
    return effects[Number(ram)] ?? 0;
  }

  function getStorageEffect(storage) {
    const effects = { 32: 5, 64: 3, 128: 1, 256: -1, 512: -3, 1024: -5 };
    return effects[Number(storage)] ?? 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function scanDensity() {
    // Browser estimate only. Android's actual system density / physical PPI cannot be read reliably here.
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round((window.screen && window.screen.width ? window.screen.width : window.innerWidth) * dpr);
    const height = Math.round((window.screen && window.screen.height ? window.screen.height : window.innerHeight) * dpr);
    const estimatedPpi = Math.round(160 * dpr);
    state.dpr = dpr;
    state.screenWidth = width;
    state.screenHeight = height;
    state.density = estimatedPpi;
    state.scanned = true;
    $("scanResult").classList.add("scanned");
    $("scanResult").innerHTML = `<span class="scan-dot"></span><span>Display estimate ready · ${width} × ${height} px · approx. ${estimatedPpi} PPI</span>`;
  }

  function calculateSettings() {
    const width = state.screenWidth || Math.round((window.screen?.width || window.innerWidth) * (window.devicePixelRatio || 1));
    const height = state.screenHeight || Math.round((window.screen?.height || window.innerHeight) * (window.devicePixelRatio || 1));
    const density = state.density || Math.round(160 * (window.devicePixelRatio || 1));
    const dpr = state.dpr || window.devicePixelRatio || 1;

    const resolutionFactor = width * height >= 2500000 ? 2 : width * height >= 1500000 ? 1 : 0;
    const ppiFactor = density >= 400 ? -2 : density >= 300 ? 0 : 2;
    const dprFactor = dpr >= 3 ? -1 : dpr <= 1 ? 1 : 0;
    const brandEffect = BRAND_FACTOR[state.brand] ?? 0;
    const ramEffect = getRamEffect(state.ram);
    const storageEffect = getStorageEffect(state.storage);
    const totalFactor = resolutionFactor + ppiFactor + dprFactor + brandEffect + ramEffect + storageEffect;
    const base = 145 + totalFactor;

    const sensitivity = {
      general: clamp(base + 15, 100, 200),
      redDot: clamp(base + 8, 90, 195),
      twoX: clamp(base, 80, 190),
      fourX: clamp(base - 12, 70, 180),
      sniper: clamp(base - 45, 40, 140),
      freeLook: clamp(base + 4, 90, 195),
      fireButton: clamp(38 + totalFactor / 2, 33, 43),
      dpi: clamp(480 - (density - 320) * 0.35 + ramEffect * 4 + storageEffect * 3 + brandEffect * 1.5, 400, 550)
    };
    return { sensitivity, density, width, height };
  }

  function renderResults() {
    const result = calculateSettings();
    $("resultDeviceName").textContent = `${state.brand} · recommended settings`;
    $("resultBrand").textContent = state.brand;
    $("resultRam").textContent = `${state.ram} GB`;
    $("resultStorage").textContent = state.storage === 1024 ? "1 TB" : `${state.storage} GB`;
    $("resultPpi").textContent = `~${result.density}`;
    $("generalValue").textContent = result.sensitivity.general;
    $("redDotValue").textContent = result.sensitivity.redDot;
    $("twoXValue").textContent = result.sensitivity.twoX;
    $("fourXValue").textContent = result.sensitivity.fourX;
    $("sniperValue").textContent = result.sensitivity.sniper;
    $("freeLookValue").textContent = result.sensitivity.freeLook;
    $("fireValue").textContent = `${result.sensitivity.fireButton}%`;
    $("dpiValue").textContent = result.sensitivity.dpi;
    showView("page-results");
  }

  function beginFindingSettings() {
    if (!state.scanned) return;
    state.brand = state.dropdownValues.brand || state.brand;
    state.ram = Number(state.dropdownValues.ram || 4);
    state.storage = Number(state.dropdownValues.storage || 128);
    showView("page-loading");
    window.setTimeout(() => {
      renderResults();
    }, 1900);
  }

  function jsonpVerify(code, deviceId) {
    return new Promise((resolve, reject) => {
      if (!CONFIG.verifyApi || !CONFIG.verifyApi.includes("/exec")) {
        reject(new Error("Verification service is not configured."));
        return;
      }
      const callbackName = "vivexVerifyCallback_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => finish(new Error("Verification timed out. Please try again.")), 15000);
      function cleanup() {
        window.clearTimeout(timeout);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        script.remove();
      }
      function finish(err, data) {
        cleanup();
        if (err) reject(err); else resolve(data);
      }
      window[callbackName] = (data) => finish(null, data);
      script.onerror = () => finish(new Error("Could not contact the verification server."));
      const separator = CONFIG.verifyApi.includes("?") ? "&" : "?";
      script.src = CONFIG.verifyApi + separator +
        "code=" + encodeURIComponent(code) +
        "&device=" + encodeURIComponent(deviceId) +
        "&callback=" + encodeURIComponent(callbackName);
      document.body.appendChild(script);
    });
  }

  async function verifyCode() {
    const code = $("verificationCode").value.trim();
    const message = $("verifyMessage");
    if (!code) {
      message.textContent = "Please enter your verification code.";
      return;
    }
    const button = document.querySelector('[data-action="verify-code"]');
    button.disabled = true;
    button.textContent = "Verifying…";
    message.textContent = "Checking your code…";
    try {
      const result = await jsonpVerify(code, getDeviceId());
      if (result && (result.success === true || result.valid === true || result.status === "success")) {
        message.textContent = "Code verified successfully.";
        showView("page-device");
      } else {
        message.textContent = (result && (result.message || result.error)) || "Invalid code or this code is linked to another device.";
      }
    } catch (error) {
      message.textContent = error.message || "Verification failed. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Verify Code";
    }
  }

  function openUrl(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const DROPDOWNS = {
    brand: { options: BRANDS.map(v => ({ value: v, label: v })), selectedId: "brandSelectedLabel", menuId: "brandOptions", initial: "POCO" },
    ram: { options: [4, 6, 8, 12, 16, 24].map(v => ({ value: String(v), label: `${v} GB` })), selectedId: "ramSelectedLabel", menuId: "ramOptions", initial: "4" },
    storage: { options: [{value:"32",label:"32 GB"},{value:"64",label:"64 GB"},{value:"128",label:"128 GB"},{value:"256",label:"256 GB"},{value:"512",label:"512 GB"},{value:"1024",label:"1 TB"}], selectedId: "storageSelectedLabel", menuId: "storageOptions", initial: "128" }
  };

  function setupCustomDropdowns() {
    Object.entries(DROPDOWNS).forEach(([key, config]) => {
      const menu = $(config.menuId);
      menu.innerHTML = "";
      config.options.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "select-option";
        button.dataset.dropdownOption = key;
        button.dataset.value = option.value;
        button.setAttribute("role", "option");
        button.textContent = option.label;
        if (String(option.value) === String(config.initial)) button.classList.add("selected");
        menu.appendChild(button);
      });
      state.dropdownValues[key] = config.initial;
      $(config.selectedId).textContent = config.options.find(o => String(o.value) === String(config.initial)).label;
    });
  }

  function closeDropdowns() {
    document.querySelectorAll(".custom-select.open").forEach(el => {
      el.classList.remove("open");
      const trigger = el.querySelector(".select-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function chooseDropdownOption(key, value, label) {
    const config = DROPDOWNS[key];
    if (!config) return;
    state.dropdownValues[key] = value;
    $(config.selectedId).textContent = label;
    $(config.menuId).querySelectorAll(".select-option").forEach(option => {
      option.classList.toggle("selected", option.dataset.value === String(value));
    });
    closeDropdowns();
    if (key === "ram" || key === "storage") {
      if (key === "ram") state.ramChosen = true;
      if (key === "storage") state.storageChosen = true;
      state.scanned = false;
      const result = $("scanResult");
      result.classList.remove("scanned");
      result.innerHTML = '<span class="scan-dot"></span><span>Selection changed · scan again to continue</span>';
      $("nextSettingsBtn").disabled = true;
    }
  }

  function setupPaymentVisuals() {
    $("upiValue").textContent = CONFIG.upiId;
    if (CONFIG.googleFormUrl) {
      const holder = $("googleFormHolder");
      holder.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.src = CONFIG.googleFormUrl;
      iframe.title = "Payment verification Google Form";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      holder.appendChild(iframe);
    }
    if (CONFIG.qrImagePath) {
      const placeholder = $("qrPlaceholder");
      placeholder.innerHTML = "";
      const img = document.createElement("img");
      img.src = CONFIG.qrImagePath;
      img.alt = "Payment QR code";
      img.style.cssText = "max-width:180px;width:100%;height:auto;object-fit:contain;border-radius:8px";
      placeholder.appendChild(img);
    }
  }

  document.addEventListener("click", (event) => {
    const option = event.target.closest("[data-dropdown-option]");
    if (option) {
      chooseDropdownOption(option.dataset.dropdownOption, option.dataset.value, option.textContent);
      return;
    }
    if (!event.target.closest(".custom-select")) closeDropdowns();
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      goTab(tab.dataset.tab);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;

    switch (action) {
      case "open-verify": showView("page-verify"); break;
      case "toggle-dropdown": {
        const wrapper = actionButton.closest(".custom-select");
        const wasOpen = wrapper.classList.contains("open");
        closeDropdowns();
        if (!wasOpen) {
          wrapper.classList.add("open");
          actionButton.setAttribute("aria-expanded", "true");
        }
        break;
      }
      case "verify-code": verifyCode(); break;
      case "go-code-tab": goTab("code"); break;
      case "select-brand":
        state.brand = state.dropdownValues.brand || "POCO";
        showView("page-scan");
        break;
      case "scan-display":
        if (!state.ramChosen || !state.storageChosen) {
          $("scanResult").innerHTML = '<span class="scan-dot"></span><span>Please select both RAM and Storage first</span>';
          $("scanResult").classList.remove("scanned");
          $("nextSettingsBtn").disabled = true;
          break;
        }
        scanDensity();
        $("nextSettingsBtn").disabled = false;
        break;
      case "show-results": beginFindingSettings(); break;
      case "open-boost": showView("page-boost"); break;
      case "back": back(); break;
      case "open-payment-form": showView("page-payment-form"); break;
      case "payment-submitted": showView("page-payment-done"); break;
      case "go-home": goTab("sensi"); break;
      case "open-tutorial":
        if (CONFIG.tutorialUrl === "https://www.youtube.com/") alert("Add your tutorial video URL in js/app.js first.");
        else openUrl(CONFIG.tutorialUrl);
        break;
      case "open-youtube": openUrl(CONFIG.youtubeUrl); break;
      case "open-instagram": openUrl(CONFIG.instagramUrl); break;
    }
  });

  // Keep a lightweight mobile-only check. Small tablets may be treated as mobile.
  function checkDesktop() {
    const isWide = window.matchMedia("(min-width: 800px)").matches;
    $("desktopBlock").classList.toggle("hidden", !isWide);
  }

  setupCustomDropdowns();
  setupPaymentVisuals();
  checkDesktop();
  window.addEventListener("resize", checkDesktop);
})();
