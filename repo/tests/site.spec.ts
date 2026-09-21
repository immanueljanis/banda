import { test, expect } from "@playwright/test";
test("the five mandates expose sourced USDG yield without implying live availability", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  for (const name of ["NEURAL", "RAILS", "RESERVE", "FRONTIER", "FORTRESS"])
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();

  for (const slug of ["neural", "rails", "reserve", "frontier", "fortress"]) {
    await page.goto(`/basket/${slug}`);
    const sleeve = page.locator(".asset-card").filter({
      has: page.getByRole("button", { name: "About USDG: USDG DeFi Yield" }),
    });
    await sleeve.locator("summary").filter({ hasText: "DeFi yield" }).click();
    await expect(sleeve).toContainText("Rates are variable");
    await expect(sleeve).toContainText("candidate");
    await expect(sleeve).toContainText("not been integrated");
    await expect(sleeve.locator(".asset-apy")).toContainText(
      /Est. APY\d+\.\d{2}%/,
    );
    await expect(
      sleeve.getByRole("link", { name: "Rate source" }),
    ).toHaveAttribute("href", /morpho\.org\/robinhood-chain\/vault/);
    await expect(page.locator(".asset-card .fact-yield")).toHaveCount(1);
  }

  await page.goto("/basket/neural");
  const gold = page.locator(".asset-card").filter({
    has: page.getByRole("button", { name: "About GLD: Gold ETF" }),
  });
  await expect(gold.locator(".asset-fact")).toHaveCount(0);
  await expect(gold.locator(".asset-apy")).toHaveCount(0);
  await gold.getByRole("button").hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByRole("tooltip")).not.toContainText(
    /KYC|verified account/i,
  );
  await expect(page.locator("body")).not.toContainText(
    /KYC|identity verification/i,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("asset explanations open on touch and close on a second tap", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/basket/neural");
  const asset = page.getByRole("button", { name: "About GLD: Gold ETF" });
  await asset.tap();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await asset.tap();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await context.close();
});
test("landing and linked pages fit mobile and desktop in both themes", async ({
  page,
}) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.goto("/");
      if (theme === "dark")
        await page
          .getByRole("button", { name: "Switch to dark theme" })
          .click();
      if (
        theme === "light" &&
        (await page
          .getByRole("button", { name: "Switch to light theme" })
          .count())
      )
        await page
          .getByRole("button", { name: "Switch to light theme" })
          .click();
      for (const route of [
        "/",
        "/basket/neural",
        "/basket/frontier",
        "/docs",
        "/portfolio",
      ]) {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});
test("browse, buy an arbitrary amount, and redeem the basket", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Browse baskets" }).click();
  await page
    .locator(".shelf-neural")
    .getByRole("link", { name: "NEURAL" })
    .click();
  await expect(page).toHaveURL(/basket\/neural/);
  await page.getByLabel("Amount in USDG").fill("17.35");
  await page
    .locator(".buy-panel")
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page.getByRole("button", { name: "Create basket" }).click();
  await expect(page.getByRole("status")).toContainText("$17.35");
  await page.getByRole("link", { name: "View portfolio" }).click();
  await expect(page.locator(".portfolio-item")).toContainText("$17.35");
  await page.getByRole("button", { name: "Redeem basket" }).click();
  await expect(page.getByText("No baskets yet.")).toBeVisible();
});
test("invalid amounts are blocked and basket tabs and chart periods work", async ({
  page,
}) => {
  await page.goto("/basket/frontier");
  await page
    .locator(".buy-panel")
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  for (const value of ["0", "-1", "9999"]) {
    await page.getByLabel("Amount in USDG").fill(value);
    await expect(
      page.getByRole("button", { name: "Create basket" }),
    ).toBeDisabled();
  }
  await expect(page.locator(".asset-card")).toHaveCount(8);
  await expect(page.locator(".donut-wrap svg")).toBeVisible();
  const asset = page.getByRole("button", { name: "About RENDER: Render" });
  await asset.focus();
  await expect(page.getByRole("tooltip")).toContainText("Render");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  expect(
    await page
      .locator(".asset-logo")
      .evaluateAll((images) =>
        images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
      ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Historical" }).click();
  for (const period of ["1W", "1M", "3M"]) {
    await page.getByRole("button", { name: period, exact: true }).click();
    await expect(
      page.getByRole("button", { name: period, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".comparison-summary")).toContainText("S&P");
    await expect(page.locator(".backtest-chart .recharts-line")).toHaveCount(2);
  }
  await page.getByRole("tab", { name: "Historical" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("No rebalances recorded.")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".risk-observation")).toBeVisible();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("link", { name: /Historical price data/ }),
  ).toBeVisible();
  const response = await page.request.get("/data/market-history.json");
  expect(response.ok()).toBe(true);
  expect((await response.json()).series.benchmark.length).toBeGreaterThan(50);
});
test("hero certificate is readable without JavaScript and with reduced motion", async ({
  browser,
}) => {
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({
      javaScriptEnabled,
      reducedMotion: "reduce",
      viewport: { width: 375, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/");
    await expect(page.locator(".hero-certificate")).toContainText("$12,480.36");
    await expect(page.locator(".consolidation")).toHaveCount(0);
    await context.close();
  }
});
