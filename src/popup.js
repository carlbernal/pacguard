const DEFAULT_SHORTCUTS_TEXT = `# Line 1: go/ link slug
# Line 2: Target website URL

wiki
wikipedia.org

gh
github.com

mail
mail.google.com
`;

const DEFAULT_BLOCKLIST_TEXT = `# One domain per line (blocks domain & all subdomains)
reddit.com
twitter.com
x.com
`;

document.addEventListener("DOMContentLoaded", async () => {
  const shortcutsTextarea = document.getElementById("shortcuts-textarea");
  const blocklistTextarea = document.getElementById("blocklist-textarea");
  const shortcutsGutter = document.getElementById("shortcuts-gutter");
  const blocklistGutter = document.getElementById("blocklist-gutter");
  const tabButtons = document.querySelectorAll(".tab-btn");

  // Load persisted text/state from storage
  const storage = await chrome.storage.local.get([
    "shortcutsText",
    "blocklistText",
    "shortcuts",
    "blocklist",
  ]);

  shortcutsTextarea.value =
    storage.shortcutsText !== undefined
      ? storage.shortcutsText
      : DEFAULT_SHORTCUTS_TEXT;
  blocklistTextarea.value =
    storage.blocklistText !== undefined
      ? storage.blocklistText
      : DEFAULT_BLOCKLIST_TEXT;

  updateGutter(shortcutsTextarea, shortcutsGutter);
  updateGutter(blocklistTextarea, blocklistGutter);
  updateCounts(
    storage.shortcuts || {},
    storage.blocklist || []
  );

  // Sync gutter scroll with textarea scroll
  shortcutsTextarea.addEventListener("scroll", () => {
    shortcutsGutter.scrollTop = shortcutsTextarea.scrollTop;
  });
  blocklistTextarea.addEventListener("scroll", () => {
    blocklistGutter.scrollTop = blocklistTextarea.scrollTop;
  });

  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const targetTab = btn.dataset.tab;
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.add("hidden");
      });
      document
        .getElementById(`panel-${targetTab}`)
        .classList.remove("hidden");

      if (targetTab === "pac") {
        const res = await chrome.runtime.sendMessage({ type: "GET_PAC_SCRIPT" });
        const preview = document.getElementById("pac-preview");
        preview.textContent = res ? res.pacScript : "// Unable to load PAC script";
      }
    });
  });

  // Auto-save with 600ms debounce (just like Charon) + instant line gutter update
  let shortcutsTimer = 0;
  let blocklistTimer = 0;
  const typingDelay = 600;

  shortcutsTextarea.addEventListener("input", () => {
    updateGutter(shortcutsTextarea, shortcutsGutter);
    clearTimeout(shortcutsTimer);
    shortcutsTimer = setTimeout(() => {
      validateAndSaveAll();
    }, typingDelay);
  });

  blocklistTextarea.addEventListener("input", () => {
    updateGutter(blocklistTextarea, blocklistGutter);
    clearTimeout(blocklistTimer);
    blocklistTimer = setTimeout(() => {
      validateAndSaveAll();
    }, typingDelay);
  });
});

// Save when popup closes
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    validateAndSaveAll();
  }
});

/** Render line numbers in the gutter and highlight an error line if present */
function updateGutter(textarea, gutter, errorLine = null) {
  const lineCount = textarea.value.split("\n").length;
  const lines = [];
  for (let i = 1; i <= lineCount; i++) {
    if (errorLine === i) {
      lines.push(`<span class="gutter-error" title="Error on line ${i}">${i} !</span>`);
    } else {
      lines.push(`<span>${i}</span>`);
    }
  }
  gutter.innerHTML = lines.join("\n");
}

function updateCounts(shortcuts, blocklist) {
  const sCount = Object.keys(shortcuts || {}).length;
  const bCount = (blocklist || []).length;
  document.getElementById("shortcuts-count").textContent =
    `${sCount} ${sCount === 1 ? "link" : "links"}`;
  document.getElementById("blocklist-count").textContent =
    `${bCount} blocked`;
}

/**
 * Parse and lint the go/ links textarea.
 * Format:
 *   Line A: go link slug (e.g. `wiki` or `go/wiki`)
 *   Line B: single target URL (e.g. `wikipedia.org` or `https://wikipedia.org`)
 * Blank lines and `#` or `//` comment lines are ignored.
 */
function parseAndLintShortcuts(rawText) {
  const lines = rawText.split("\n");
  const activeEntries = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }
    activeEntries.push({ text: trimmed, lineNum: i + 1 });
  }

  const shortcuts = {};

  for (let idx = 0; idx < activeEntries.length; idx += 2) {
    const slugEntry = activeEntries[idx];
    const urlEntry = activeEntries[idx + 1];

    // Check if user entered a URL on the slug line by mistake
    if (
      slugEntry.text.includes("://") ||
      (slugEntry.text.includes(".") && !slugEntry.text.toLowerCase().startsWith("go/"))
    ) {
      return {
        ok: false,
        line: slugEntry.lineNum,
        error: `Line ${slugEntry.lineNum}: Expected a go/ link name (e.g. "wiki"), but found URL "${slugEntry.text}".`,
      };
    }

    const cleanSlug = slugEntry.text
      .replace(/^go\//i, "")
      .replace(/^\/+|\/+$/g, "");

    if (!/^[a-zA-Z0-9._-]+$/.test(cleanSlug)) {
      return {
        ok: false,
        line: slugEntry.lineNum,
        error: `Line ${slugEntry.lineNum}: Invalid go/ link "${slugEntry.text}". Use letters, numbers, '-', or '_'.`,
      };
    }

    if (shortcuts[cleanSlug]) {
      return {
        ok: false,
        line: slugEntry.lineNum,
        error: `Line ${slugEntry.lineNum}: Duplicate go/${cleanSlug} shortcut.`,
      };
    }

    if (!urlEntry) {
      return {
        ok: false,
        line: slugEntry.lineNum,
        error: `Line ${slugEntry.lineNum}: Missing target URL on the next line for "go/${cleanSlug}".`,
      };
    }

    // Ensure single website only (no spaces or comma-separated lists)
    if (/\s|,/.test(urlEntry.text)) {
      return {
        ok: false,
        line: urlEntry.lineNum,
        error: `Line ${urlEntry.lineNum}: Only one website URL is allowed per go/ link.`,
      };
    }

    const normalizedUrl = validateAndNormalizeUrl(urlEntry.text);
    if (!normalizedUrl) {
      return {
        ok: false,
        line: urlEntry.lineNum,
        error: `Line ${urlEntry.lineNum}: Invalid website URL "${urlEntry.text}" for go/${cleanSlug}.`,
      };
    }

    shortcuts[cleanSlug] = normalizedUrl;
  }

  return { ok: true, shortcuts };
}

/**
 * Parse and lint the newline-separated blocklist textarea.
 * Format: one domain per line (e.g., `reddit.com`).
 * Blank lines and `#` or `//` comments are ignored.
 */
function parseAndLintBlocklist(rawText) {
  const lines = rawText.split("\n");
  const blocklist = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }

    if (/\s/.test(trimmed)) {
      return {
        ok: false,
        line: lineNum,
        error: `Line ${lineNum}: Put only one domain per line (no spaces).`,
      };
    }

    // Strip protocol or trailing slashes if user pasted a full URL, but warn if path exists
    let clean = trimmed.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (clean.includes("/") && clean.split("/")[1].length > 0) {
      return {
        ok: false,
        line: lineNum,
        error: `Line ${lineNum}: Enter a domain only (e.g. "${clean.split("/")[0]}"), not a page path.`,
      };
    }
    clean = clean.replace(/\/+$/, "");

    // Validate domain format (must have a dot and valid hostname chars)
    const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(clean)) {
      return {
        ok: false,
        line: lineNum,
        error: `Line ${lineNum}: "${trimmed}" is not a valid domain (example: reddit.com).`,
      };
    }

    if (!seen.has(clean)) {
      seen.add(clean);
      blocklist.push(clean);
    }
  }

  return { ok: true, blocklist };
}

function validateAndNormalizeUrl(input) {
  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(withProto);
    if (!u.hostname || !u.hostname.includes(".")) {
      return null;
    }
    return withProto;
  } catch {
    return null;
  }
}

async function validateAndSaveAll() {
  const shortcutsTextarea = document.getElementById("shortcuts-textarea");
  const blocklistTextarea = document.getElementById("blocklist-textarea");
  const shortcutsGutter = document.getElementById("shortcuts-gutter");
  const blocklistGutter = document.getElementById("blocklist-gutter");
  const statusDot = document.getElementById("status-dot");

  const shortcutsRes = parseAndLintShortcuts(shortcutsTextarea.value);
  if (!shortcutsRes.ok) {
    updateGutter(shortcutsTextarea, shortcutsGutter, shortcutsRes.line);
    statusDot.classList.add("error");
    showToast(shortcutsRes.error, "error");
    return;
  }
  updateGutter(shortcutsTextarea, shortcutsGutter, null);

  const blocklistRes = parseAndLintBlocklist(blocklistTextarea.value);
  if (!blocklistRes.ok) {
    updateGutter(blocklistTextarea, blocklistGutter, blocklistRes.line);
    statusDot.classList.add("error");
    showToast(blocklistRes.error, "error");
    return;
  }
  updateGutter(blocklistTextarea, blocklistGutter, null);

  statusDot.classList.remove("error");

  try {
    await chrome.storage.local.set({
      shortcutsText: shortcutsTextarea.value,
      blocklistText: blocklistTextarea.value,
      shortcuts: shortcutsRes.shortcuts,
      blocklist: blocklistRes.blocklist,
    });
    updateCounts(shortcutsRes.shortcuts, blocklistRes.blocklist);
    showToast(
      `Saved (${Object.keys(shortcutsRes.shortcuts).length} go/ links, ${blocklistRes.blocklist.length} blocked domains)`,
      "ok"
    );
  } catch (err) {
    console.error(err);
    showToast("Error saving configuration to storage.", "error");
  }
}

function showToast(message, type = "ok") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
}
