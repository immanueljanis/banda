import { test, expect } from "@playwright/test";
test("portfolio animation keeps the certificate readable and can be replayed", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator(".hero-certificate");
  await expect(hero.locator(".assembly-asset")).toHaveCount(6);
  await expect(hero.locator(".certificate-value")).toBeVisible();
  await expect(hero.locator(".consolidation")).toHaveCount(0);
  await hero
    .getByRole("button", { name: "Replay portfolio animation" })
    .click();
  await expect(hero.locator(".certificate-value")).toBeVisible();
  await expect(hero.locator(".assembly-asset")).toHaveCount(6);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    hero.getByRole("button", { name: "Replay portfolio animation" }),
  ).toHaveCount(0);
  await expect(hero.locator(".assembly-asset")).toHaveCount(6);
});
