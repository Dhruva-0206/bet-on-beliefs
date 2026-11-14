// Read-only layout and keyboard checks. No wallet connection or transaction.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.argv[2] ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const reports = [];
await mkdir("test-results", { recursive: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await expect(page.locator(".stats")).toBeVisible({ timeout: 45000 });
    await expect(
      page.getByText("Advanced: change market contract", { exact: true }),
    ).toBeVisible();
    expect(await page.locator(".advanced").getAttribute("open")).toBeNull();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to proposals" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    const focus = [];
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => {
        const e = document.activeElement,
          r = e.getBoundingClientRect(),
          c = getComputedStyle(e);
        return {
          tag: e.tagName,
          text: (e.textContent ?? "").trim().slice(0, 70),
          outline: c.outlineStyle,
          outlineWidth: parseFloat(c.outlineWidth),
          visible: r.bottom > 0 && r.top < innerHeight,
        };
      });
      if (f.tag === "BODY") break;
      if (f.outline === "none") console.error("Focus diagnostic:", f);
      expect(f.visible).toBe(true);
      expect(f.outline).not.toBe("none");
      expect(f.outlineWidth).toBeGreaterThanOrEqual(3);
      focus.push(f);
    }
    const metrics = await page.evaluate(() => {
      const visible = (e) =>
        e.getBoundingClientRect().width > 0 &&
        e.getBoundingClientRect().height > 0;
      const rgb = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lum = (v) =>
        v
          .map((x) => {
            x /= 255;
            return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          })
          .reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
      const contrasts = [
        "body",
        ".control-help",
        ".eyebrow",
        ".stats small",
        ".network",
        "label",
        "footer",
      ].map((selector) => {
        const e = document.querySelector(selector);
        let parent = e,
          bg = "";
        while (parent) {
          bg = getComputedStyle(parent).backgroundColor;
          if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") break;
          parent = parent.parentElement;
        }
        const a = lum(rgb(getComputedStyle(e).color)),
          b = lum(rgb(bg || "rgb(23,21,27)"));
        return {
          selector,
          ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        };
      });
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        smallButtons: [...document.querySelectorAll("button")]
          .filter(visible)
          .filter((e) => e.getBoundingClientRect().height < 44).length,
        unlabelled: [...document.querySelectorAll("input,select,textarea")]
          .filter(visible)
          .filter((e) => !e.labels?.length && !e.getAttribute("aria-label"))
          .length,
        contrasts,
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.smallButtons).toBe(0);
    expect(metrics.unlabelled).toBe(0);
    for (const c of metrics.contrasts)
      expect(c.ratio).toBeGreaterThanOrEqual(4.5);
    await page
      .getByText("Advanced: change market contract", { exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("textbox", { name: "Market contract" }),
    ).toBeVisible();
    await page.keyboard.press("Enter"); // summary retains focus and closes again
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/release-${width}.png`,
      fullPage: true,
    });
    if (width === 768) {
      await page.addStyleTag({ content: "html {font-size:200% !important}" });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: "test-results/release-text200.png",
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
    reports.push({
      width,
      ...metrics,
      keyboard_focus_checks: focus.length,
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
const report = {
  checked_at_utc: new Date().toISOString(),
  url,
  reports,
  scope:
    "Read-only live data, 4 viewport widths, keyboard focus, labels, button heights, selected text contrasts, reduced motion and root-text enlargement. Not a full WCAG audit.",
  wallet_signed: false,
};
await writeFile(
  "test-results/release-review.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
