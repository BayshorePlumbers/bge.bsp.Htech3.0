(function () {
  "use strict";

  // ---------- DOM helper ----------
  const $ = (id) => document.getElementById(id);

  // ---------- Helpers ----------
  function clampMin0(n) {
    return n < 0 ? 0 : n;
  }

  function toNumber(val) {
    if (val === null || val === undefined) return 0;
    const s = String(val).replace(/[^0-9.\-]/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function money(n) {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function setMoneyText(el, n) {
    if (!el) return;
    el.textContent = money(n);
  }

    // ---------- Bayshore Standard: inline hints ----------
  function ensureHintEl(forEl) {
    if (!forEl || !forEl.parentElement) return null;
    const parent = forEl.parentElement;
    let hint = parent.querySelector(`.field-hint[data-for="${forEl.id}"]`);
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "field-hint";
      hint.dataset.for = forEl.id;
      parent.appendChild(hint);
    }
    return hint;
  }

  function showHint(forEl, msg) {
    const hint = ensureHintEl(forEl);
    if (!hint) return;
    hint.textContent = msg || "";
    hint.classList.toggle("is-visible", !!msg);
    if (msg) forEl.classList.add("has-error");
    else forEl.classList.remove("has-error");
  }

  // ---------- Bayshore Standard: select-all (iPad/Safari reliable) ----------
  function selectAllSafe(el) {
    if (!el || el.readOnly || el.disabled) return;
    const doSelect = () => {
      try { el.focus({ preventScroll: true }); } catch (_) {}
      const v = el.value || "";
      try {
        el.select();
        try { el.setSelectionRange(0, v.length); } catch (_) {}
      } catch (_) {
        try { el.setSelectionRange(0, v.length); } catch (_) {}
      }
    };
    requestAnimationFrame(() => setTimeout(doSelect, 0));
  }

  function wireSelectAll(el) {
    if (!el) return;
    const handler = () => selectAllSafe(el);
    el.addEventListener("pointerdown", handler, { passive: true });
    el.addEventListener("touchstart", handler, { passive: true });
    el.addEventListener("focus", handler);
    el.addEventListener("click", handler);
  }

  function wireSelectAllForAllEditableInputs() {
    const inputs = Array.from(document.querySelectorAll("input, textarea")).filter((el) => {
      if (el.tagName === "TEXTAREA") return !el.readOnly && !el.disabled;
      if (el.tagName !== "INPUT") return false;
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "hidden" || type === "radio" || type === "checkbox" || type === "button" || type === "submit") return false;
      return !el.readOnly && !el.disabled;
    });
    inputs.forEach(wireSelectAll);
  }

  // ---------- Bayshore Standard: Money (format on blur only) ----------
  function parseMoney(val) {
    const n = toNumber(val);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoneyToInput(el) {
    if (!el) return;
    const raw = String(el.value || "");
    const n = parseMoney(raw);

    if (n < 0) {
      el.value = "";
      showHint(el, "No negatives");
      return;
    }
    showHint(el, "");

    const finalN = raw.trim() === "" ? 0 : n;
    el.value = money(finalN);
  }

  function getMoneyDollars(el) {
    if (!el) return 0;
    const n = parseMoney(el.value);
    return n < 0 ? 0 : n;
  }

  function wireMoneyField(el, onChange) {
    if (!el) return;
    el.addEventListener("input", () => {
      const n = parseMoney(el.value);
      if (n < 0) showHint(el, "No negatives");
      else showHint(el, "");
      if (typeof onChange === "function") onChange();
    });
    el.addEventListener("blur", () => {
      formatMoneyToInput(el);
      if (typeof onChange === "function") onChange();
    });
  }

  // ---------- Bayshore Standard: Hours (0.5 increments, display “8 hrs / 8.5 hrs”) ----------
  function snapHalfHours(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 2) / 2;
  }

  function formatHoursDisplay(n) {
    const v = snapHalfHours(n);
    return `${v} hrs`;
  }

  function parseHours(val) {
    const s = String(val || "").replace(/hrs?/gi, "");
    return toNumber(s);
  }

  function formatHoursToInput(el, { min = 0, minHint = "" } = {}) {
    if (!el) return 0;
    const raw = String(el.value || "");
    const n0 = parseHours(raw);

    if (n0 < 0) {
      el.value = "";
      showHint(el, "No negatives");
      return 0;
    }

    let n = raw.trim() === "" ? 0 : n0;
    n = snapHalfHours(n);

    if (n < min) {
      n = min;
      if (minHint) showHint(el, minHint);
    } else {
      showHint(el, "");
    }

    el.value = formatHoursDisplay(n);
    return n;
  }

  function getHours(el) {
    if (!el) return 0;
    const n = snapHalfHours(parseHours(el.value));
    return n < 0 ? 0 : n;
  }

  function wireHoursField(el, opts, onChange) {
    if (!el) return;
    el.addEventListener("input", () => {
      const n = parseHours(el.value);
      if (n < 0) showHint(el, "No negatives");
      else showHint(el, "");
      if (typeof onChange === "function") onChange();
    });
    el.addEventListener("blur", () => {
      formatHoursToInput(el, opts);
      if (typeof onChange === "function") onChange();
    });
  }

  // ---------- Bayshore Standard: Date (text, today autofill, “Dec 31, 2025”) ----------
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function formatDateLong(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function parseDateFlexibleEnUS(input) {
    const s = String(input || "").trim();
    if (!s) return null;

    const native = new Date(s);
    if (!isNaN(native.getTime())) return native;

    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      const mm = parseInt(m[1], 10);
      const dd = parseInt(m[2], 10);
      let yy = parseInt(m[3], 10);
      if (yy < 100) yy += 2000;
      const d = new Date(yy, mm - 1, dd);
      if (d.getFullYear() === yy && d.getMonth() === mm - 1 && d.getDate() === dd) return d;
    }
    return null;
  }

  function wireDateField(el, { autofillToday = false } = {}) {
    if (!el) return;
    if (autofillToday && !String(el.value || "").trim()) {
      el.value = formatDateLong(new Date());
    }
    el.addEventListener("blur", () => {
      const raw = String(el.value || "");
      if (!raw.trim()) {
        showHint(el, "");
        return;
      }
      const d = parseDateFlexibleEnUS(raw);
      if (!d) {
        showHint(el, "Invalid date");
        return;
      }
      showHint(el, "");
      el.value = formatDateLong(d);
    });
  }

  // ---------- Bayshore Standard: Title Case on blur ----------
  function toTitleCase(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }

  function wireTitleCase(el) {
    if (!el) return;
    el.addEventListener("blur", () => {
      const v = String(el.value || "");
      if (!v.trim()) return;
      el.value = toTitleCase(v);
    });
  }

  // ---------- Bayshore Standard: Tooltips (tap friendly) ----------
  const TOOLTIP_TEXT = {
    pd: "Total duration of the project in hrs.",
    labor: "Man-hours (labor time)."
  };

  function wireTooltips() {
    let openBubble = null;

    const close = () => {
      if (openBubble) {
        openBubble.remove();
        openBubble = null;
      }
    };

    document.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest && e.target.closest(".tip-btn");
      if (!btn) {
        close();
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      close();

      const key = btn.getAttribute("data-tip");
      const text = TOOLTIP_TEXT[key] || "";
      if (!text) return;

      const bubble = document.createElement("div");
      bubble.className = "tip-bubble";
      bubble.textContent = text;
      document.body.appendChild(bubble);

      const r = btn.getBoundingClientRect();
      const top = window.scrollY + r.bottom + 8;
      const left = window.scrollX + Math.max(12, Math.min(r.left, window.innerWidth - 260));
      bubble.style.top = `${top}px`;
      bubble.style.left = `${left}px`;

      openBubble = bubble;
    }, true);

    window.addEventListener("scroll", () => { if (openBubble) close(); }, { passive: true });
    window.addEventListener("resize", () => { if (openBubble) close(); }, { passive: true });
  }


    function requireValidTechOrAlert() {
        const v = (els.tn && els.tn.value ? els.tn.value.trim() : "");
        if (isAllowedTechName(v)) return true;

        alert('Sales Rep Name must be exactly "Alberto Lopez" or "David Jimenez" or "Jose Rodriguez".');
        if (els.tn) {
            els.tn.value = "";
            els.tn.focus();
        }
        return false;
    }

    // ---------- Allowed technicians (ONLY these two) ----------
    const ALLOWED_TECHS = ["Jose Rodriguez", "Alberto Lopez"];

    function isAllowedTechName(name) {
        return ALLOWED_TECHS.includes((name || "").trim());
    }

    // Type-ahead: as user types a prefix, auto-complete to the first match
    function wireTechNameTypeahead() {
        if (!els.tn) return;

        els.tn.addEventListener("input", () => {
        const raw = els.tn.value || "";
        const typed = raw.trim();

        // allow clearing
        if (typed.length === 0) return;

        const lower = typed.toLowerCase();
        const match = ALLOWED_TECHS.find((n) => n.toLowerCase().startsWith(lower));
        if (!match) return;

        // If already exact, do nothing
        if (match === raw) return;

        // Only autocomplete when typing at end (prevents fighting edits)
        const caret = els.tn.selectionStart;
        if (caret !== raw.length) return;

        els.tn.value = match;
        try {
            els.tn.setSelectionRange(typed.length, match.length);
        } catch (_) {}
        });

        // Enforce only valid names on blur (no other names allowed)
        els.tn.addEventListener("blur", () => {
        const v = (els.tn.value || "").trim();

        // if empty, keep empty (but it will be blocked on calculate/print)
        if (v.length === 0) return;

        // if not an exact allowed name, clear it
        if (!isAllowedTechName(v)) {
            els.tn.value = "";
        }
        });
    }


  // ---------- Elements ----------
  const els = {
    csulYes: $("csulYes"),
    csulNo: $("csulNo"),
    csulValue: $("csulValue"),

    tn: $("tn"),
    ja: $("ja"),
    date: $("date"),
    potentialStart: $("potentialStart"),

    tp: $("tp"),
    material: $("material"),
    oe: $("oe"),

    pd: $("pd"),
    day1: $("day1"),
    day2: $("day2"),
    day3: $("day3"),
    day4: $("day4"),
    day5: $("day5"),
    ah: $("ah"),
    toh: $("toh"),
    totalHours: $("totalHours"),

    sw: $("sw"),
    wh: $("wh"),
    rd: $("rd"),
    bpp: $("bpp"),

    totalCommission: $("totalCommission"),

        calculateBtn: $("calculateBtn"),
        printButton: $("printButton"),

    // Bayshore Standard print container (same-tab)
    printSheet: $("printSheet"),
  };

  // ---------- CSUL toggle ----------
  function isCSULSelected() {
    return !!(els.csulYes && els.csulYes.checked);
  }

    function syncToggleStyles() {
        const yes = isCSULSelected();
        if (els.csulValue) els.csulValue.value = yes ? "yes" : "no";
    }

  function wireToggle() {
    if (els.csulYes) {
      els.csulYes.addEventListener("change", () => {
        syncToggleStyles();
        recalc();
      });
    }
    if (els.csulNo) {
      els.csulNo.addEventListener("change", () => {
        syncToggleStyles();
        recalc();
      });
    }
  }

  // ---------- Project Duration ----------
  function normalizePD(raw) {
  // Bayshore Standard: PD is ALWAYS min 1 hr (safety clamp)
  let v = clampMin0(toNumber(raw));
  v = Math.round(v * 2) / 2; // nearest 0.5
  if (v < 1) v = 1;
  return v;
}

  function wirePD() {
  if (!els.pd) return;
  // Bayshore Standard: snap to 0.5 and enforce min 1 hr, show “Min 1 hr” hint
  wireHoursField(els.pd, { min: 1, minHint: "Min 1 hr" }, recalc);

  // Ensure display is formatted on init
  if (!String(els.pd.value || "").trim()) els.pd.value = "1";
  formatHoursToInput(els.pd, { min: 1, minHint: "" });
}

  // ---------- Total Hours ----------
  function calcTotalHours() {
  const day1 = getHours(els.day1);
  const day2 = getHours(els.day2);
  const day3 = getHours(els.day3);
  const day4 = getHours(els.day4);
  const day5 = getHours(els.day5);
  const ah = getHours(els.ah);
  const toh = getHours(els.toh);

  // NOTE: keeping existing math logic (OT counts as 1.5x)
  const total = clampMin0(day1 + day2 + day3 + day4 + day5 + ah + 1.5 * toh);

  // Bayshore Standard: derived total hours shown must respect 0.5 increments
  const snapped = snapHalfHours(total);
  if (els.totalHours) els.totalHours.value = formatHoursDisplay(snapped);
  return snapped;
}

  // ---------- BP% message ----------
  function bppMessage(pct) {
    if (pct < 10) return "👎: JOB BUST. PLEASE SEE GM";
    if (pct <= 19.99) return "😬: MARGINAL PROFIT";
    if (pct <= 29.99) return "👍: GOOD WORK";
    if (pct <= 39.99) return "😀: NICE WORK";
    if (pct <= 59.99) return "⭐: GREAT WORK";
    return "🌟: EXCELLENT WORK";
  }

  // ---------- Main calculation ----------
  function recalc() {
    const tp = getMoneyDollars(els.tp);
    const material = getMoneyDollars(els.material);
    const oe = getMoneyDollars(els.oe);

    const pd = normalizePD(els.pd ? els.pd.value : 0);
    const totalHours = calcTotalHours();

    const overheads = pd * 290;

    const commissionRate = 0.05;
    const salesCommission = tp * commissionRate;

    const grossAmount = tp - material * 1.2 - totalHours * 95 - oe;
    const finalProfit = grossAmount - overheads - salesCommission;
    const pct = tp !== 0 ? (finalProfit / tp) * 100 : 0;

    if (els.bpp) els.bpp.value = bppMessage(pct);

    const swPct = tp !== 0 ? ((material * 1.2) / tp) * 100 : 0;
    if (els.sw) els.sw.value = swPct.toFixed(2);
    if (els.wh) els.wh.value = swPct.toFixed(2);
    if (els.rd) els.rd.value = swPct.toFixed(2);

    setMoneyText(els.totalCommission, salesCommission);
  }

    // =========================================================
  // PRINTING (Bayshore Standard — SAME TAB)
  // - Build print-only HTML into #printSheet
  // - body.is-printing gates payrollprint.css to show only #printSheet
  // - A4 one-page fit via body class-only scale steps
  // - Restore via afterprint + matchMedia fallback + 20s last resort
  // =========================================================

  const PRINT_SCALE_CLASSES = [
    "print-scale-100",
    "print-scale-97",
    "print-scale-95",
    "print-scale-93",
    "print-scale-90",
    "print-scale-88",
    "print-scale-85",
  ];

  function clearPrintScaleClasses() {
    PRINT_SCALE_CLASSES.forEach((c) => document.body.classList.remove(c));
  }

  function getA4TargetHeightPx() {
    return 1122; // ~11.69in * 96dpi (heuristic; CSS controls actual print sizing)
  }

  function buildPrintHTML() {
    recalc();

    const logoSrc = `BP.png?v=${Date.now()}`;

    const salesRepName = (els.tn && els.tn.value) || "";
    const jobAddress = (els.ja && els.ja.value) || "";
    const date = (els.date && els.date.value) || "";
    const potentialStart = (els.potentialStart && els.potentialStart.value) || "";

    const projectHours = normalizePD(els.pd ? els.pd.value : 0);
    const materialExpenses = money(getMoneyDollars(els.material));
    const otherExpenses = money(getMoneyDollars(els.oe));
    const totalPrice = money(getMoneyDollars(els.tp));

    const day1 = (els.day1 && els.day1.value) || "0";
    const day2 = (els.day2 && els.day2.value) || "0";
    const day3 = (els.day3 && els.day3.value) || "0";
    const day4 = (els.day4 && els.day4.value) || "0";
    const day5 = (els.day5 && els.day5.value) || "0";
    const additionalHours = (els.ah && els.ah.value) || "0";
    const overtimeHours = (els.toh && els.toh.value) || "0";
    const totalHours = (els.totalHours && els.totalHours.value) || "0";

    const sw = (els.sw && els.sw.value) || "0.00";
    const wh = (els.wh && els.wh.value) || "0.00";
    const rd = (els.rd && els.rd.value) || "0.00";
    const bpp = (els.bpp && els.bpp.value) || "";

    // Keep existing HOURLY logic: commission is fixed 5%
    const csulText = "5% (Fixed)";
    const salesCommission = money(getMoneyDollars(els.tp) * 0.05);

    return `
      <div id="printRoot">
        <div class="print-header">
          <img src="${logoSrc}" alt="BP logo" class="logo">
          <h2>SALES COMMISSION DOCUMENT</h2>
        </div>

        <div class="container">
          <div class="no-break details-section">
            <h3>DETAILS:</h3>
            <table class="input-data">
              <tr><th>Sales Rep Name:</th><td>${salesRepName}</td></tr>
              <tr><th>Job Address:</th><td>${jobAddress}</td></tr>
              <tr><th>Date:</th><td>${date}</td></tr>
              <tr><th>Potential Start Date:</th><td>${potentialStart}</td></tr>
              <tr><th>Estimated Project Duration:</th><td>${projectHours} hrs</td></tr>
              <tr><th>Estimated Material Expenses:</th><td>${materialExpenses}</td></tr>
              <tr><th>Estimated Other Expenses:</th><td>${otherExpenses}</td></tr>
              <tr><th>Estimated Total Price:</th><td>${totalPrice}</td></tr>
            </table>
          </div>

          <div class="no-break">
            <h3>ESTIMATED LABOR DETAILS:</h3>
            <table class="input-data">
              <tr><th>Day 1</th><th>Day 2</th><th>Day 3</th><th>Day 4</th></tr>
              <tr><td>${day1}</td><td>${day2}</td><td>${day3}</td><td>${day4}</td></tr>
            </table>

            <table class="input-data">
              <tr><th>Day 5</th><th>Additional Hours</th><th>Total Overtime Hours</th><th>Total Hours</th></tr>
              <tr><td>${day5}</td><td>${additionalHours}</td><td>${overtimeHours}</td><td>${totalHours}</td></tr>
            </table>
          </div>

          <div class="no-break">
            <h3>FOR OFFICE USE ONLY:</h3>
            <table class="input-data">
              <tr><th>SW21/RP21</th><th>WH32</th><th>RD15/UL15</th><th>BPP%</th></tr>
              <tr><td>${sw}</td><td>${wh}</td><td>${rd}</td><td>${bpp}</td></tr>
            </table>
          </div>

          <div class="no-break commission-details-section">
            <h3>COMMISSION DETAILS:</h3>
            <table class="input-data">
              <tr><th>S/W/G/CS Selection:</th><td>${csulText}</td></tr>
              <tr><th>Sales Commission:</th><td>${salesCommission}</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function waitForPrintImages(rootEl) {
    if (!rootEl) return Promise.resolve();
    const imgs = Array.from(rootEl.querySelectorAll("img"));
    if (!imgs.length) return Promise.resolve();

    return new Promise((resolve) => {
      let remaining = imgs.length;
      const done = () => {
        remaining -= 1;
        if (remaining <= 0) resolve();
      };
      imgs.forEach((img) => {
        if (img.complete) return done();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
      setTimeout(resolve, 1200);
    });
  }

  function chooseBestPrintScale() {
    clearPrintScaleClasses();

    const sheet = els.printSheet;
    if (!sheet) return;

    const root = sheet.querySelector("#printRoot");
    if (!root) return;

    const targetH = getA4TargetHeightPx();

    for (const cls of PRINT_SCALE_CLASSES) {
      document.body.classList.add(cls);
      const h = root.getBoundingClientRect().height;

      if (h <= targetH) return;

      document.body.classList.remove(cls);
    }

    document.body.classList.add(PRINT_SCALE_CLASSES[PRINT_SCALE_CLASSES.length - 1]);
  }

  let restoreTimer = null;
  let lastResortTimer = null;
  let mmPrintListener = null;

  function restoreUIAfterPrint() {
    if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
    if (lastResortTimer) { clearTimeout(lastResortTimer); lastResortTimer = null; }
    if (mmPrintListener) {
      try { mmPrintListener.mql.removeEventListener("change", mmPrintListener.fn); } catch (_) {}
      mmPrintListener = null;
    }

    document.body.classList.remove("is-printing");
    clearPrintScaleClasses();
    if (els.printSheet) els.printSheet.innerHTML = "";
  }

  function beginPrintSameTab() {
    if (!els.printSheet) return;

    els.printSheet.innerHTML = buildPrintHTML();
    document.body.classList.add("is-printing");

    chooseBestPrintScale();

    const root = els.printSheet.querySelector("#printRoot");

    // Restore hooks
    const afterprintHandler = () => restoreUIAfterPrint();
    window.addEventListener("afterprint", afterprintHandler, { once: true });

    // matchMedia fallback
    try {
      const mql = window.matchMedia("print");
      const fn = (e) => {
        if (!e.matches) restoreUIAfterPrint();
      };
      mql.addEventListener("change", fn);
      mmPrintListener = { mql, fn };
    } catch (_) {}

    // 20-second last resort if stuck
    lastResortTimer = setTimeout(() => restoreUIAfterPrint(), 20000);

    // Ensure logo is loaded before opening print preview
    waitForPrintImages(root).then(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            window.print();
          } finally {
            // safety restore in case cancel doesn't fire reliably
            restoreTimer = setTimeout(() => restoreUIAfterPrint(), 2500);
          }
        }, 50);
      });
    });
  }

  // ---------- Wiring ----------
  function wireNumbersRecalc() {
    const ids = ["pd", "day1", "day2", "day3", "day4", "day5", "ah", "toh"];
    ids.forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", recalc);
      el.addEventListener("change", recalc);
    });

    if (els.calculateBtn) {
        els.calculateBtn.addEventListener("click", () => {
            if (!requireValidTechOrAlert()) return;
            recalc();
        });
    }

        if (els.printButton) {
        els.printButton.addEventListener("click", () => {
            if (!requireValidTechOrAlert()) return;
            beginPrintSameTab();
        });
    }
  }

    // ---------- Init ----------
  function initDefaults() {
    if (els.tn) {
      els.tn.value = "";    // start empty
      els.tn.readOnly = false;
    }

    // Bayshore Standard wiring
    wireSelectAllForAllEditableInputs();
    wireTooltips();
    wireTitleCase(els.tn);
    wireTitleCase(els.ja);
    wireDateField(els.date, { autofillToday: true });
    wireDateField(els.potentialStart, { autofillToday: false });

    // Money wiring + initialize display
    wireMoneyField(els.tp, recalc);
    wireMoneyField(els.material, recalc);
    wireMoneyField(els.oe, recalc);

    if (els.tp && !String(els.tp.value || "").trim()) els.tp.value = "$0.00";
    if (els.material && !String(els.material.value || "").trim()) els.material.value = "$0.00";
    if (els.oe && !String(els.oe.value || "").trim()) els.oe.value = "$0.00";

    // Hours wiring + initialize display
    // PD must be min 1 hr always
    if (els.pd && !String(els.pd.value || "").trim()) els.pd.value = "1";
    wirePD(); // wires PD with min=1 + formats it to "1 hrs" on init

    ["day1", "day2", "day3", "day4", "day5", "ah", "toh"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      wireHoursField(el, { min: 0, minHint: "" }, recalc);
      if (!String(el.value || "").trim()) el.value = "0";
      formatHoursToInput(el, { min: 0, minHint: "" }); // converts to "0 hrs"
    });

    if (els.totalHours) els.totalHours.value = formatHoursDisplay(0);

    // Office-use defaults
    if (els.sw) els.sw.value = "0.00";
    if (els.wh) els.wh.value = "0.00";
    if (els.rd) els.rd.value = "0.00";
    if (els.bpp) els.bpp.value = "👎: JOB BUST. PLEASE SEE GM";

    // Toggle (we'll fix styling approach in section C below)
    syncToggleStyles();

    wireTechNameTypeahead();
  }

    // boot
  initDefaults();
  wireToggle();
  wireNumbersRecalc();
  recalc();
})();
