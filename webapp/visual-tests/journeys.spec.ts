import { test, expect, type Page, type TestInfo } from "@playwright/test";
import axe, { type AxeResults } from "axe-core";
import { writeFile } from "node:fs/promises";

declare global { interface Window { axe: typeof axe } }

const widths = [320, 390, 768, 1440];
const phones = { parent: "+2250700000101", teacher: "+2250700000102", empty: "+2250700000198", error: "+2250700000199" };
const javascriptErrors = new WeakMap<Page, string[]>();

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function noOverflow(page: Page) {
  await settle(page);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, `Document trop large : ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, `Page trop large : ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function accessible(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ content: axe.source });
  const result: AxeResults = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
  }));
  const violations = result.violations.map(({ id, impact, help, nodes }) => ({
    id, impact, help, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
  }));
  const path = info.outputPath(`${name}-accessibilite.json`);
  await writeFile(path, JSON.stringify({ url: page.url(), rulesPassed: result.passes.length, violations, incomplete: result.incomplete.map(({ id }) => id) }, null, 2));
  await info.attach(`${name}-accessibilite`, { path, contentType: "application/json" });
  expect(violations, `${name} : défauts d’accessibilité automatiques`).toEqual([]);
}

async function checkpoint(page: Page, info: TestInfo, name: string, options: { capture?: boolean; audit?: boolean; fullPage?: boolean } = {}) {
  await noOverflow(page);
  if (options.capture !== false) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const path = info.outputPath(`${name}.png`);
    await page.screenshot({ path, fullPage: options.fullPage ?? true, animations: "disabled" });
    await info.attach(name, { path, contentType: "image/png" });
  }
  if (options.audit !== false) await accessible(page, info, name);
}

async function go(page: Page, route: string, ready: string | RegExp) {
  await page.goto(`./#${route}`);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: ready, exact: typeof ready === "string" }).first()).toBeVisible();
  await settle(page);
}

async function login(page: Page, role: keyof typeof phones, info?: TestInfo, capture = false) {
  await page.goto("./#/login");
  await expect(page.getByLabel("Téléphone", { exact: true })).toBeVisible();
  if (info && capture) await checkpoint(page, info, "connexion");
  await page.getByLabel("Téléphone", { exact: true }).fill(phones[role]);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  const challenge = await response;
  expect(challenge.status()).toBe(202);
  expect(await challenge.json()).toMatchObject({ otpRequired: true, demo: false });
  expect(await page.evaluate(() => localStorage.getItem("mpp_user_jwt"))).toBeNull();
  await expect(page.getByLabel("Code à 6 chiffres", { exact: true })).toBeVisible();
  if (info && capture && page.viewportSize()?.width === 390) await checkpoint(page, info, "verification-otp");
  await page.getByLabel("Code à 6 chiffres", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Valider le code", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(role === "teacher" ? "#/prof-espace$" : "#/accueil$"));
  await expect(page.getByRole("main")).toBeVisible();
}

test.beforeAll(async ({ request }) => {
  const response = await request.get("http://127.0.0.1:8099/health");
  expect(await response.json(), "La recette doit utiliser exclusivement le serveur local de données fictives").toMatchObject({ fixture: true, external: false });
});

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "8099") {
      await route.continue();
    } else {
      errors.push(`La recette a bloqué une API hors fixture locale : ${url.origin}`);
      await route.abort("blockedbyclient");
    }
  });
  // Only uncaught JavaScript errors: an intentional 503 is tested separately.
  javascriptErrors.set(page, errors);
});

test.afterEach(async ({ page }, info) => {
  const errors = javascriptErrors.get(page);
  if (errors?.length) await info.attach("erreurs-javascript", { body: JSON.stringify(errors, null, 2), contentType: "application/json" });
  expect(errors || [], "Aucune erreur JavaScript non gérée").toEqual([]);
});

for (const width of widths) {
  test(`parent : connexion, recherche et réservation — ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width >= 768 ? 960 : 844 });
    await login(page, "parent", info, true);
    await expect(page.getByRole("main").getByText("Mathématiques", { exact: false }).first()).toBeVisible();
    await checkpoint(page, info, "accueil-parent");

    await go(page, "/recherche", "Trouver un professeur");
    const teacher = page.getByRole("main").getByRole("link", { name: /Mariam Coulibaly/ });
    await expect(teacher).toBeVisible();
    await checkpoint(page, info, "recherche-professeurs");
    await teacher.click();
    await expect(page.getByRole("heading", { name: "Mariam Coulibaly", exact: true })).toBeVisible();
    await checkpoint(page, info, "fiche-professeur", { capture: width === 390 || width === 1440 });

    await page.getByRole("link", { name: "Réserver un cours", exact: true }).click();
    await expect(page.getByLabel("Matière", { exact: true })).toHaveValue("Mathématiques");
    await page.getByLabel("Niveau", { exact: true }).fill("3ème");
    await page.getByLabel("Commune / quartier", { exact: true }).fill("Cocody — quartier de recette visuelle");
    await page.getByLabel("Adresse précise et accès (privés)", { exact: true }).fill("Adresse fictive utilisée uniquement pour vérifier le formulaire et son affichage sur un petit écran.");
    await expect(page.getByRole("button", { name: "Enregistrer la demande", exact: true })).toBeVisible();
    await checkpoint(page, info, "reservation", { capture: width === 320 || width === 390 || width === 1440 });
    // No reservation or payment is sent by this visual-only suite.

    if (width === 390 || width === 1440) {
      await go(page, "/cours", "Mes cours");
      const detail = page.locator('main a[href="#/cours/501"]');
      await expect(detail).toBeVisible();
      await checkpoint(page, info, "mes-cours");
      await detail.click();
      await expect(page.getByRole("heading", { name: "Votre rendez-vous", exact: true })).toBeVisible();
      await checkpoint(page, info, "detail-cours");
      await go(page, "/compte", "Mon profil");
      await checkpoint(page, info, "mon-compte");
      await page.getByRole("link", { name: /^Mes données \/ suppression du compte/ }).click();
      await expect(page.getByRole("heading", { name: "Conditions d’utilisation et confidentialité", exact: true })).toBeVisible();
      await expect(page.getByText("Vous avez accepté les versions actuellement publiées.", { exact: true })).toBeVisible();
      await checkpoint(page, info, "confidentialite");
    }
  });
}

for (const width of [390, 1440]) {
  test(`professeur : accueil, demandes, revenus et profil — ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await login(page, "teacher");
    await checkpoint(page, info, "accueil-professeur");
    await go(page, "/prof-offres", "Réservations directes à traiter");
    await expect(page.getByText("Aïcha Koné", { exact: false }).first()).toBeVisible();
    await checkpoint(page, info, "offres-professeur");
    const filter = page.getByRole("button", { name: /^Filtrer \(/ });
    await filter.click();
    const filters = page.getByRole("dialog", { name: "Filtrer les offres", exact: true });
    await expect(filters).toBeVisible();
    await expect(filter).toHaveAttribute("aria-expanded", "true");
    await checkpoint(page, info, "filtres-offres", { capture: width === 390, fullPage: false });
    await page.keyboard.press("Escape");
    await expect(filters).not.toBeVisible();
    await expect(filter).toBeFocused();
    await expect(filter).toHaveAttribute("aria-expanded", "false");
    const sort = page.getByRole("button", { name: /^Trier ·/ });
    await sort.click();
    const sorting = page.getByRole("dialog", { name: "Trier les offres", exact: true });
    await expect(sorting).toBeVisible();
    await checkpoint(page, info, "tri-offres", { capture: width === 390, fullPage: false });
    await sorting.getByRole("button", { name: "Tarif (plus élevé)", exact: true }).click();
    await expect(sorting).not.toBeVisible();
    await expect(sort).toBeFocused();
    await expect(sort).toContainText("Tarif ↓");
    await go(page, "/prof-revenus", "Mon relevé");
    await expect(page.getByText("Disponible pour un reversement", { exact: false })).toBeVisible();
    await checkpoint(page, info, "revenus-professeur");
    await go(page, "/prof-profil", "Compléter mon profil");
    await expect(page.getByLabel("Localisation", { exact: true })).toHaveValue("Cocody, Abidjan");
    await checkpoint(page, info, "profil-professeur");
  });
}

test("détail d’une opportunité locale : dialogue et action accessibles sur 320px", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await login(page, "teacher");
  // The shared native fixture contains only a direct booking. Extend this one
  // local read response with an OfferReq-shaped opportunity to exercise the
  // browser dialog; retain the direct booking and never submit either action.
  await page.route("http://localhost:8099/api/teacher/requests", async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const directBookings = await response.json();
    await route.fulfill({ response, json: [...directBookings, {
      needId: 701, isOpportunity: true, initials: "AK", name: "Cocody",
      student: "Élève de recette · 3ème", subject: "Mathématiques", slot: "Cocody, Abidjan",
      format: "home", price: 7500, netHourly: 4000, duration: "1 h 30",
      frequency: "Une séance par semaine", startDate: "2099-11-02T16:00:00Z",
      availabilityWeek: true, availabilityWeekend: true, availabilityHolidays: false,
      hasCat: true, hasDog: false, lat: null, lng: null, ago: "Recette visuelle",
    }] });
  });
  await go(page, "/prof-offres", "Réservations directes à traiter");
  const consult = page.getByRole("button", { name: "Consulter", exact: true });
  await expect(consult).toBeVisible();
  await checkpoint(page, info, "opportunite-locale-320", { capture: false });
  await consult.click();
  const dialog = page.getByRole("dialog", { name: "Détail de l’offre", exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  const action = dialog.getByRole("button", { name: "Accepter cette offre", exact: true });
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  await dialog.evaluate((element) => element.scrollTo(0, 0));
  await checkpoint(page, info, "detail-opportunite-320", { fullPage: false });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(consult).toBeFocused();
});

test("navigation mobile : focus du menu, Échap et texte à 200 %", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await login(page, "parent");
  const trigger = page.getByRole("button", { name: "Ouvrir le menu", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Navigation principale", exact: true });
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate((element) => element.contains(document.activeElement)), "Le menu doit recevoir le focus à son ouverture").toBe(true);
  for (let index = 0; index < 15; index += 1) {
    await page.keyboard.press("Tab");
    // Chromium may briefly focus its own browser chrome after the last control.
    // No focusable element of the background page may be reached.
    expect(await drawer.evaluate((element) => element.contains(document.activeElement)
      || (document.activeElement === document.body && !document.hasFocus())), "Le focus ne doit pas atteindre le contenu de fond").toBe(true);
  }
  await checkpoint(page, info, "menu-mobile", { fullPage: false });
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await trigger.click();
  await drawer.getByRole("link", { name: "Recherche", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Trouver un professeur", exact: true })).toBeVisible();

  await go(page, "/reservation?teacherId=101", "Mariam Coulibaly");
  await expect(page.getByLabel("Matière", { exact: true })).toHaveValue("Mathématiques");
  // Double the computed text size, including pixel sizes, without changing the
  // viewport or hiding overflow. This checks content reflow, not native zoom.
  await page.evaluate(() => {
    const sizes = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .filter((element) => element instanceof HTMLElement)
      .map((element) => {
        const style = getComputedStyle(element);
        return { element, font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight) };
      });
    for (const { element, font, line } of sizes) {
      if (Number.isFinite(font)) element.style.fontSize = `${font * 2}px`;
      if (Number.isFinite(line)) element.style.lineHeight = `${line * 2}px`;
    }
  });
  const action = page.getByRole("button", { name: "Enregistrer la demande", exact: true });
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  expect(await action.evaluate((element) => element.scrollHeight <= element.clientHeight + 1), "Le libellé de l’action doit rester entièrement lisible").toBe(true);
  await checkpoint(page, info, "reservation-texte-200");
});

test("inscription : consentement long lisible sur 320px", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./#/inscription");
  await expect(page.getByLabel("Nom complet", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox").first()).toBeEnabled();
  await checkpoint(page, info, "inscription-320");
  // The complete legal version remains reachable without crowding the form.
  const details = page.locator("details");
  if (await details.count()) {
    await details.locator("summary").first().click();
    await noOverflow(page);
    await expect(page.getByText(/visual-7f3f0ea170ab/)).toBeVisible();
  }
});

test("état vide : aucun professeur ou cours inventé", async ({ page }, info) => {
  await login(page, "empty");
  await go(page, "/recherche", "Trouver un professeur");
  await expect(page.getByText("Aucun professeur trouvé.", { exact: true })).toBeVisible();
  await expect(page.locator('main a[href^="#/prof/"]')).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await checkpoint(page, info, "recherche-vide");
  await go(page, "/cours", "Mes cours");
  await expect(page.getByText("Aucun cours dans cette sélection.", { exact: true })).toBeVisible();
  await expect(page.locator('main a[href^="#/cours/"]')).toHaveCount(0);
  await checkpoint(page, info, "cours-vides", { capture: false });
});

test("panne API : message de réessai distinct de l’état vide", async ({ page }, info) => {
  await login(page, "error");
  await go(page, "/recherche", "Trouver un professeur");
  await expect(page.getByRole("alert")).toContainText("Les données n’ont pas pu être chargées.");
  await expect(page.getByText("Aucun professeur trouvé.", { exact: true })).toHaveCount(0);
  await expect(page.locator('main a[href^="#/prof/"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Les données n’ont pas pu être chargées.");
  await checkpoint(page, info, "recherche-indisponible");
  await go(page, "/cours", "Mes cours");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Aucun cours dans cette sélection.", { exact: true })).toHaveCount(0);
  await checkpoint(page, info, "cours-indisponibles", { capture: false });
});

test("connexion : changement d’onglet après indisponibilité des canaux", async ({ page }, info) => {
  let unavailable = true;
  let requests = 0;
  await page.route("**/api/auth/otp-channels", async (route) => {
    requests += 1;
    if (unavailable) await route.fulfill({ status: 503, json: { error: "visual_channels_unavailable" } });
    else await route.fallback();
  });
  await page.goto("./#/login");
  await expect(page.getByRole("alert")).toContainText("Les moyens de vérification sont indisponibles");
  await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Réessayer le chargement", exact: true })).toBeVisible();
  await checkpoint(page, info, "connexion-canaux-indisponibles", { capture: false });
  const before = requests;
  unavailable = false;
  await page.getByRole("button", { name: "Inscription", exact: true }).click();
  await expect.poll(() => requests).toBeGreaterThan(before);
  await expect(page.getByRole("checkbox").first()).toBeEnabled();
  await expect(page.getByRole("button", { name: "Créer mon compte", exact: true })).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await noOverflow(page);
});
