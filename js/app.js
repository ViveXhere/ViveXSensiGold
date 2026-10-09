
(() => {
  "use strict";

  // ========== CONFIG ==========
  const CONFIG = {
    verifyApi: "https://script.google.com/macros/s/AKfycbxejo41XCZAECqxPviHVpiZnLdcLAEmVxEQ4utRRP47NAlol24sWuCbJjxeCVXMcOT3ng/exec",
    tutorialUrl: "https://www.youtube.com/",
    youtubeUrl: "https://www.youtube.com/@ViveXhere",
    instagramUrl: "https://www.instagram.com/its.vivexhere/",
    googleFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdZjtz_CZodGAsSfiY4nw25uvLCd1I411cHp-zB4v34juRq3A/viewform?embedded=true",
    upiId: "deadlyvivek018@okhdfcbank",
    qrImagePath: "assets/qr.png"
  };

  const BRANDS = [
    "Samsung", "Realme", "Vivo", "OPPO", "Xiaomi", "Redmi",
    "OnePlus", "Motorola", "Infinix", "Tecno", "iQOO",
    "Apple", "POCO", "Nothing", "Honor", "Google Pixel"
  ];

  const BRAND_FACTOR = {
    Samsung: 0, Realme: 2, Vivo: 2, OPPO: 1,
    Xiaomi: 3, Redmi: 3, OnePlus: 4, Motorola: 0,
    Infinix: 3, Tecno: 3, iQOO: 5, Apple: -3,
    POCO: 4, Nothing: 1, Honor: 1, "Google Pixel": -2
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
    dropdownValues: {
      brand: "POCO",
      ram: "4",
      storage: "128"
    },
    ramChosen: false,
    storageChosen: false
  };

  const $ = id => document.getElementById(id);
  const pageStack = [];

  // ========== NAVIGATION ==========

  function showView(id, push = true) {
    const views = [...document.querySelectorAll(".view")];
    const current = views.find(v => v.classList.contains("active"));

    if (current && current.id !== id && push) {
      pageStack.push(current.id);
    }

    views.forEach(v => v.classList.toggle("active", v.id === id));

    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle(
        "active",
        id === `tab-${btn.dataset.tab}`
      );
    });

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function back() {
    showView(pageStack.pop() || "tab-sensi", false);
  }

  function goTab(tab) {
    pageStack.length = 0;
    showView(`tab-${tab}`, false);
  }

  function openUrl(url) {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  // ========== DEVICE ID ==========

  function makeRandomId() {
    const bytes = new Uint8Array(16);

    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    return Array.from(
      bytes,
      b => b.toString(16).padStart(2, "0")
    ).join("");
  }

  function getDeviceId() {
    let id = "";

    try {
      id = localStorage.getItem("vivex_device_id") || "";
    } catch (_) {}

    if (!id) {
      id = "vx-" + makeRandomId();

      try {
        localStorage.setItem("vivex_device_id", id);
      } catch (_) {}
    }

    return id;
  }

  // ========== SENSITIVITY CALCULATION ==========

  function getRamEffect(ram) {
    return ({
      4: 5, 6: 3, 8: 1,
      12: -1, 16: -3, 24: -5
    })[Number(ram)] ?? 0;
  }

  function getStorageEffect(storage) {
    return ({
      32: 5, 64: 3, 128: 1,
      256: -1, 512: -3, 1024: -5
    })[Number(storage)] ?? 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function scanDensity() {
    const dpr = window.devicePixelRatio || 1;
    const sw = window.screen?.width || window.innerWidth;
    const sh = window.screen?.height || window.innerHeight;

    const width = Math.round(sw * dpr);
    const height = Math.round(sh * dpr);
    const ppi = Math.round(160 * dpr);

    state.dpr = dpr;
    state.screenWidth = width;
    state.screenHeight = height;
    state.density = ppi;
    state.scanned = true;

    const result = $("scanResult");

    if (result) {
      result.classList.add("scanned");
      result.innerHTML =
        `<span class="scan-dot"></span>` +
        `<span>Display estimate ready · ${width} × ${height} px · ` +
        `approx. ${ppi} PPI</span>`;
    }
  }

  function calculateSettings() {
    const dpr = state.dpr || window.devicePixelRatio || 1;

    const width = state.screenWidth ||
      Math.round((window.screen?.width || window.innerWidth) *
      (window.devicePixelRatio || 1));

    const height = state.screenHeight ||
      Math.round((window.screen?.height || window.innerHeight) *
      (window.devicePixelRatio || 1));

    const density = state.density || Math.round(160 * dpr);

    const resolutionFactor =
      width * height >= 2500000 ? 2 :
      width * height >= 1500000 ? 1 : 0;

    const ppiFactor =
      density >= 400 ? -2 :
      density >= 300 ? 0 : 2;

    const dprFactor = dpr >= 3 ? -1 : dpr <= 1 ? 1 : 0;

    const brandEffect = BRAND_FACTOR[state.brand] ?? 0;
    const ramEffect = getRamEffect(state.ram);
    const storageEffect = getStorageEffect(state.storage);

    const totalFactor =
      resolutionFactor + ppiFactor + dprFactor +
      brandEffect + ramEffect + storageEffect;

    const base = 145 + totalFactor;

    const sensitivity = {
      general: clamp(base + 15, 100, 200),
      redDot: clamp(base + 8, 90, 195),
      twoX: clamp(base, 80, 190),
      fourX: clamp(base - 12, 70, 180),
      sniper: clamp(base - 45, 40, 140),
      freeLook: clamp(base + 4, 90, 195),
      fireButton: clamp(38 + totalFactor / 2, 33, 43),
      dpi: clamp(
        480 - (density - 320) * 0.35 +
        ramEffect * 4 + storageEffect * 3 +
        brandEffect * 1.5,
        400, 550
      )
    };

    return { sensitivity, density, width, height };
  }

  function renderResults() {
    const result = calculateSettings();

    const values = {
      resultDeviceName: `${state.brand} · recommended settings`,
      resultBrand: state.brand,
      resultRam: `${state.ram} GB`,
      resultStorage: state.storage === 1024
        ? "1 TB" : `${state.storage} GB`,
      resultPpi: `~${result.density}`,
      generalValue: result.sensitivity.general,
      redDotValue: result.sensitivity.redDot,
      twoXValue: result.sensitivity.twoX,
      fourXValue: result.sensitivity.fourX,
      sniperValue: result.sensitivity.sniper,
      freeLookValue: result.sensitivity.freeLook,
      fireValue: `${result.sensitivity.fireButton}%`,
      dpiValue: result.sensitivity.dpi
    };

    Object.entries(values).forEach(([id, value]) => {
      const element = $(id);
      if (element) element.textContent = value;
    });

    showView("page-results");
  }

  function beginFindingSettings() {
    if (!state.scanned) return;

    state.brand = state.dropdownValues.brand || state.brand;
    state.ram = Number(state.dropdownValues.ram || 4);
    state.storage = Number(state.dropdownValues.storage || 128);

    showView("page-loading");

    window.setTimeout(renderResults, 1900);
  }

  // ========== VERIFICATION ==========

  function jsonpVerify(code, deviceId) {
    return new Promise((resolve, reject) => {
      const api = CONFIG.verifyApi;

      if (!api || !api.includes("/exec")) {
        reject(new Error("Verification service is not configured."));
        return;
      }

      const callbackName =
        "vivexCallback_" + Date.now() +
        "_" + Math.floor(Math.random() * 10000);

      const script = document.createElement("script");
      let finished = false;

      function finish(error, data) {
        if (finished) return;
        finished = true;

        window.clearTimeout(timer);
        script.remove();

        try {
          delete window[callbackName];
        } catch (_) {
          window[callbackName] = undefined;
        }

        if (error) reject(error);
        else resolve(data);
      }

      const timer = window.setTimeout(() => {
        finish(new Error("Verification timed out. Please try again."));
      }, 15000);

      window[callbackName] = data => finish(null, data);
      script.onerror = () => {
        finish(new Error("Could not contact the verification server."));
      };

      const separator = api.includes("?") ? "&" : "?";

      script.src = api + separator +
        "code=" + encodeURIComponent(code) +
        "&device=" + encodeURIComponent(deviceId) +
        "&callback=" + encodeURIComponent(callbackName);

      document.body.appendChild(script);
    });
  }

  async function verifyCode() {
    const input = $("verificationCode");
    const message = $("verifyMessage");

    if (!input || !message) return;

    const code = input.value.trim();

    if (!code) {
      message.textContent = "Please enter your verification code.";
      return;
    }

    const button = document.querySelector(
      '[data-action="verify-code"]'
    );

    if (button) {
      button.disabled = true;
      button.textContent = "Verifying…";
    }

    message.textContent = "Checking your code…";

    try {
      const result = await jsonpVerify(code, getDeviceId());

      if (result && (
        result.success === true ||
        result.valid === true ||
        result.status === "success"
      )) {
        message.textContent = "Code verified successfully.";
        showView("page-device");
      } else {
        message.textContent =
          result?.message ||
          result?.error ||
          "Invalid code or this code is linked to another device.";
      }
    } catch (error) {
      message.textContent =
        error.message || "Verification failed. Please try again.";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Verify Code";
      }
    }
  }

  // ========== DROPDOWNS ==========

  const DROPDOWNS = {
    brand: {
      options: BRANDS.map(v => ({ value: v, label: v })),
      selectedId: "brandSelectedLabel",
      menuId: "brandOptions",
      initial: "POCO"
    },
    ram: {
      options: [4, 6, 8, 12, 16, 24].map(v => ({
        value: String(v),
        label: `${v} GB`
      })),
      selectedId: "ramSelectedLabel",
      menuId: "ramOptions",
      initial: "4"
    },
    storage: {
      options: [
        { value: "32", label: "32 GB" },
        { value: "64", label: "64 GB" },
        { value: "128", label: "128 GB" },
        { value: "256", label: "256 GB" },
        { value: "512", label: "512 GB" },
        { value: "1024", label: "1 TB" }
      ],
      selectedId: "storageSelectedLabel",
      menuId: "storageOptions",
      initial: "128"
    }
  };

  function setupCustomDropdowns() {
    Object.entries(DROPDOWNS).forEach(([key, config]) => {
      const menu = $(config.menuId);
      const label = $(config.selectedId);

      if (!menu || !label) return;

      menu.innerHTML = "";

      config.options.forEach(option => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "select-option";
        button.dataset.dropdownOption = key;
        button.dataset.value = String(option.value);
        button.setAttribute("role", "option");
        button.textContent = option.label;

        if (String(option.value) === config.initial) {
          button.classList.add("selected");
        }

        menu.appendChild(button);
      });

      state.dropdownValues[key] = config.initial;

      const initial = config.options.find(
        option => String(option.value) === config.initial
      );

      label.textContent = initial ? initial.label : config.initial;
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

    state.dropdownValues[key] = String(value);

    const selectedLabel = $(config.selectedId);
    if (selectedLabel) selectedLabel.textContent = label;

    const menu = $(config.menuId);

    if (menu) {
      menu.querySelectorAll(".select-option").forEach(option => {
        option.classList.toggle(
          "selected",
          option.dataset.value === String(value)
        );
      });
    }

    closeDropdowns();

    if (key === "brand") state.brand = String(value);

    if (key === "ram" || key === "storage") {
      if (key === "ram") state.ramChosen = true;
      if (key === "storage") state.storageChosen = true;

      state.scanned = false;

      const result = $("scanResult");

      if (result) {
        result.classList.remove("scanned");
        result.innerHTML =
          '<span class="scan-dot"></span>' +
          '<span>Selection changed · scan again to continue</span>';
      }

      const next = $("nextSettingsBtn");
      if (next) next.disabled = true;
    }
  }

  // ========== GOOGLE FORM FIX ==========

  function setupPaymentVisuals() {
    const upi = $("upiValue");
    if (upi) upi.textContent = CONFIG.upiId;

    const qr = document.querySelector(
      "#qrPlaceholder .payment-qr"
    );

    if (qr && CONFIG.qrImagePath) {
      qr.src = CONFIG.qrImagePath;
    }

    const holder = $("googleFormHolder");

    if (!holder) {
      console.error(
        "ViveX Sensi: #googleFormHolder missing from index.html"
      );
      return;
    }

    // Remove the original placeholder.
    holder.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.src = CONFIG.googleFormUrl;
    iframe.title = "Payment verification Google Form";
    iframe.loading = "eager";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.width = "100%";
    iframe.style.height = "620px";
    iframe.style.minHeight = "600px";
    iframe.style.display = "block";
    iframe.style.border = "0";
    iframe.style.background = "#fff";
    iframe.style.borderRadius = "10px";

    holder.appendChild(iframe);

    // Direct link as a fallback if embedding is blocked.
    const link = document.createElement("a");

    link.href = CONFIG.googleFormUrl.replace("?embedded=true", "");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Form not loading? Open the form directly";
    link.style.display = "block";
    link.style.padding = "12px";
    link.style.textAlign = "center";
    link.style.color = "#D6AD55";

    holder.appendChild(link);
  }

  // ========== CLICK HANDLERS ==========

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const option = event.target.closest("[data-dropdown-option]");

    if (option) {
      chooseDropdownOption(
        option.dataset.dropdownOption,
        option.dataset.value,
        option.textContent.trim()
      );
      return;
    }

    if (!event.target.closest(".custom-select")) {
      closeDropdowns();
    }

    const tab = event.target.closest("[data-tab]");

    if (tab) {
      goTab(tab.dataset.tab);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    switch (button.dataset.action) {
      case "open-verify":
        showView("page-verify");
        break;

      case "toggle-dropdown": {
        const wrapper = button.closest(".custom-select");
        if (!wrapper) break;

        const wasOpen = wrapper.classList.contains("open");
        closeDropdowns();

        if (!wasOpen) {
          wrapper.classList.add("open");
          button.setAttribute("aria-expanded", "true");
        }
        break;
      }

      case "verify-code":
        verifyCode();
        break;

      case "go-code-tab":
        goTab("code");
        break;

      case "select-brand":
        state.brand = state.dropdownValues.brand || "POCO";
        showView("page-scan");
        break;

      case "scan-display": {
        const result = $("scanResult");
        const next = $("nextSettingsBtn");

        if (!state.ramChosen || !state.storageChosen) {
          if (result) {
            result.classList.remove("scanned");
            result.innerHTML =
              '<span class="scan-dot"></span>' +
              '<span>Please select both RAM and Storage first</span>';
          }

          if (next) next.disabled = true;
          break;
        }

        scanDensity();
        if (next) next.disabled = false;
        break;
      }

      case "show-results":
        beginFindingSettings();
        break;

      case "open-boost":
        showView("page-boost");
        break;

      case "back":
        back();
        break;

      case "open-payment-form":
        showView("page-payment-form");
        break;

      case "payment-submitted":
        showView("page-payment-done");
        break;

      case "go-home":
        goTab("sensi");
        break;

      case "open-tutorial":
        openUrl(CONFIG.tutorialUrl);
        break;

      case "open-youtube":
        openUrl(CONFIG.youtubeUrl);
        break;

      case "open-instagram":
        openUrl(CONFIG.instagramUrl);
        break;
    }
  });

  // ========== DESKTOP BLOCK ==========

  function checkDesktop() {
    const block = $("desktopBlock");
    if (!block || !window.matchMedia) return;

    block.classList.toggle(
      "hidden",
      !window.matchMedia("(min-width: 800px)").matches
    );
  }

  // ========== INITIALIZATION ==========

  function initializeApp() {
    try {
      setupCustomDropdowns();
    } catch (error) {
      console.error("Dropdown initialization error:", error);
    }

    try {
      setupPaymentVisuals();
    } catch (error) {
      console.error("Google Form initialization error:", error);

      const holder = $("googleFormHolder");

      if (holder) {
        holder.innerHTML = "";

        const link = document.createElement("a");
        link.href = CONFIG.googleFormUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open payment form";

        holder.appendChild(link);
      }
    }

    checkDesktop();
    window.addEventListener("resize", checkDesktop);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeApp,
      { once: true }
    );
  } else {
    initializeApp();
  }
})();
