import { test, expect, type Page } from '@playwright/test';

/** iPhone-class CSS viewport used by the mobile usability gate. */
const MOBILE = { width: 390, height: 844 };

const DOMAIN_SLUGS = [
  'research_pipeline',
  'extraction_pipeline',
  'customer_support',
  'code_exploration',
] as const;

async function noSevereHorizontalOverflow(page: Page) {
  const { scrollW, vw } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    vw: window.innerWidth,
  }));
  expect(scrollW, `scrollWidth ${scrollW} vs viewport ${vw}`).toBeLessThanOrEqual(vw + 2);
}

async function openMobileNav(page: Page) {
  const menu = page.getByRole('button', { name: /Open menu/i });
  await expect(menu).toBeVisible();
  await expect(async () => {
    if ((await menu.getAttribute('aria-expanded')) !== 'true') {
      await menu.click();
    }
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
  }).toPass({ timeout: 15000 });
  return page.getByRole('dialog', { name: /Site navigation/i });
}

async function waitForExamReady(page: Page, opts?: { questionOf?: number }) {
  await expect(page.getByTestId('exam-question-stem')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('exam-options').locator('label').first()).toBeVisible();
  if (opts?.questionOf) {
    await expect(page.getByText(new RegExp(`Question 1 of ${opts.questionOf}`))).toBeVisible();
  } else {
    await expect(page.getByText(/Question 1 of \d+/)).toBeVisible();
  }
}

async function expectQuestionNumber(page: Page, n: number) {
  await expect(page.getByText(new RegExp(`Question ${n} of \\d+`))).toBeVisible({
    timeout: 10000,
  });
}

async function acceptDialogs(page: Page) {
  page.on('dialog', async (d) => {
    try {
      await d.accept();
    } catch {
      /* already handled */
    }
  });
}

/** Wipe persisted exam session so start CTAs never hit the discard confirm mid-suite. */
async function clearClientSession(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function startFromPractice(page: Page, buttonName: RegExp, urlRe: RegExp) {
  await acceptDialogs(page);
  await page.goto('/practice', { waitUntil: 'domcontentloaded' });
  await clearClientSession(page);
  // Also wipe the in-memory zustand key so discard-confirm cannot fire from a prior sitting.
  await page.evaluate(() => {
    try {
      localStorage.removeItem('ccaf-exam-storage');
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const btn = page.getByRole('button', { name: buttonName });
  await expect(btn).toBeVisible({ timeout: 15000 });
  await btn.click();
  try {
    await page.waitForURL(urlRe, { timeout: 20000 });
  } catch {
    // Rare race: confirm dialog or stale session — hard reset and try once more.
    await clearClientSession(page);
    await page.goto('/practice', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: buttonName }).click();
    await page.waitForURL(urlRe, { timeout: 30000 });
  }
}

test.describe('Mobile viewport — exam sitting', () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test('question stem and options are visible with non-zero layout box', async ({ page }) => {
    await page.goto('/exam', { waitUntil: 'domcontentloaded' });
    await waitForExamReady(page);

    const stem = page.getByTestId('exam-question-stem');
    const stemBox = await stem.boundingBox();
    expect(stemBox!.height).toBeGreaterThan(20);
    expect(stemBox!.width).toBeGreaterThan(100);
    await expect(stem).not.toBeEmpty();

    const option = page.getByTestId('exam-options').locator('label').first();
    const optBox = await option.boundingBox();
    expect(optBox!.height).toBeGreaterThan(20);
    expect(optBox!.width).toBeGreaterThan(100);
    await noSevereHorizontalOverflow(page);
  });

  test('selecting an option updates selection state', async ({ page }) => {
    await page.goto('/exam', { waitUntil: 'domcontentloaded' });
    await waitForExamReady(page);
    const option = page.getByTestId('exam-options').locator('label').first();
    await option.click();
    await expect(page.locator('input[type=radio]:checked')).toHaveCount(1);
    await expect(option).toHaveClass(/border-primary|bg-primary/);
  });

  test('next / previous still show a readable question', async ({ page }) => {
    await page.goto('/exam', { waitUntil: 'domcontentloaded' });
    await waitForExamReady(page);
    const stem = page.getByTestId('exam-question-stem');
    const firstText = (await stem.innerText()).trim();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expectQuestionNumber(page, 2);
    await expect(stem).not.toHaveText(firstText, { timeout: 10000 });
    const stemBox = await stem.boundingBox();
    expect(stemBox!.y).toBeGreaterThanOrEqual(0);
    expect(stemBox!.y).toBeLessThan(MOBILE.height);
    await expect(page.getByTestId('exam-options').locator('label').first()).toBeVisible();

    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expectQuestionNumber(page, 1);
    await expect(stem).toHaveText(firstText, { timeout: 10000 });
  });

  test('palette navigation shows a question', async ({ page }) => {
    await page.goto('/exam', { waitUntil: 'domcontentloaded' });
    await waitForExamReady(page);
    const stem = page.getByTestId('exam-question-stem');
    const firstText = (await stem.innerText()).trim();

    // aria-label is "Question N" / "Question N, current" — use anchored regex so 5 ≠ 15/50.
    await page
      .getByRole('complementary')
      .getByRole('button', { name: /^Question 5(?:$|,)/ })
      .click();
    await expectQuestionNumber(page, 5);
    await expect(stem).not.toHaveText(firstText, { timeout: 10000 });
    const stemBox = await stem.boundingBox();
    expect(stemBox!.y).toBeGreaterThanOrEqual(0);
    expect(stemBox!.y).toBeLessThan(MOBILE.height);
  });

  test('flag control is tappable on mobile', async ({ page }) => {
    await page.goto('/exam', { waitUntil: 'domcontentloaded' });
    await waitForExamReady(page);
    const flag = page.getByRole('button', { name: /Flag for review/i });
    await expect(flag).toBeVisible();
    await flag.click();
    await expect(flag).toHaveAttribute('aria-pressed', 'true');
    await expect(flag).toHaveClass(/destructive|border-destructive|bg-destructive/);
  });
});

test.describe('Mobile viewport — product journeys', () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test('home setup modal opens and begins a timed exam', async ({ page }) => {
    await acceptDialogs(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await clearClientSession(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: /Start mock exam/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /Exam setup/i })).toBeVisible({
      timeout: 10000,
    });
    const begin = page.getByRole('button', { name: /Begin exam/i });
    await expect(begin).toBeVisible();
    await noSevereHorizontalOverflow(page);

    await page.getByPlaceholder(/CyberNinja|nickname/i).fill('MobileE2E');
    await begin.click();
    await page.waitForURL(/\/exam/, { timeout: 30000 });
    await waitForExamReady(page, { questionOf: 60 });
    await expect(page.getByText(/Practice - untimed/i)).toHaveCount(0);
  });

  test('practice → untimed full mock', async ({ page }) => {
    await startFromPractice(page, /Start untimed/i, /\/exam/);
    await waitForExamReady(page, { questionOf: 60 });
    await expect(page.getByText(/Practice - untimed/i)).toBeVisible();
    await noSevereHorizontalOverflow(page);
  });

  test('practice → domain drill (15 questions)', async ({ page }) => {
    await startFromPractice(page, /Research pipelines/i, /\/exam/);
    await waitForExamReady(page, { questionOf: 15 });
    await noSevereHorizontalOverflow(page);
  });

  test('practice → flashcards reveal and rate', async ({ page }) => {
    await startFromPractice(page, /Start flashcards/i, /\/flashcards/);
    await expect(page.getByTestId('flashcard-stem')).toBeVisible({ timeout: 15000 });
    await noSevereHorizontalOverflow(page);

    const reveal = page.getByTestId('flashcard-reveal');
    await expect(reveal).toBeVisible({ timeout: 15000 });
    await expect(reveal).toBeEnabled({ timeout: 20000 });
    await reveal.click();
    await expect(page.getByTestId('flashcard-got-it')).toBeVisible();
    await expect(page.getByTestId('flashcard-review-again')).toBeVisible();
    await page.getByTestId('flashcard-got-it').click();
    await expect(page.getByText(/Card 2 of/i)).toBeVisible({ timeout: 10000 });
  });

  test('domain drill can be answered through to results', async ({ page }) => {
    test.setTimeout(120000);
    await startFromPractice(page, /Code exploration/i, /\/exam/);
    await waitForExamReady(page, { questionOf: 15 });

    for (let i = 0; i < 15; i++) {
      await page.getByTestId('exam-options').locator('label').first().click();
      if (i < 14) {
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await expectQuestionNumber(page, i + 2);
      }
    }
    await page.getByRole('button', { name: /Submit Exam/i }).click();
    await page.waitForURL(/\/result/, { timeout: 60000 });
    await expect(page.getByRole('heading', { name: /Exam Results/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/\/\s*1000/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Challenge a friend/i })).toBeVisible();
    await expect(page.getByText(/Performance by domain/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Download certificate/i })).toBeVisible();
    await noSevereHorizontalOverflow(page);
  });
});

test.describe('Mobile viewport — all surfaces', () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test('home, nav open/close, and nav destinations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('button', { name: /Start mock exam|Start the mock/i }).first()
    ).toBeVisible();
    await noSevereHorizontalOverflow(page);

    const dialog = await openMobileNav(page);
    await expect(dialog.getByRole('link', { name: /Dashboard/i })).toBeVisible();

    const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme);
    const themeBtn = dialog.getByRole('button', { name: /Switch to (light|dark) theme/i });
    await themeBtn.scrollIntoViewIfNeeded();
    await themeBtn.click({ force: true });
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.theme), {
        timeout: 5000,
      })
      .not.toBe(themeBefore);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /Open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
      { timeout: 10000 }
    );

    const destinations: { name: RegExp; assert: RegExp }[] = [
      { name: /Leaderboard/i, assert: /Global Leaderboard/i },
      { name: /Dashboard/i, assert: /Your Dashboard/i },
      { name: /Guide/i, assert: /guide|study|prepare|Claude/i },
      { name: /Sample questions/i, assert: /Sample/i },
      { name: /FAQ/i, assert: /Frequently asked|FAQ/i },
      { name: /About/i, assert: /About/i },
    ];
    for (const dest of destinations) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const d = await openMobileNav(page);
      await d.getByRole('link', { name: dest.name }).click();
      await expect(page.locator('main')).toBeVisible();
      const mainText = (await page.locator('main').innerText()).trim();
      expect(mainText.length).toBeGreaterThan(40);
      await expect(page.getByRole('heading').filter({ hasText: dest.assert }).first()).toBeVisible({
        timeout: 15000,
      });
      await noSevereHorizontalOverflow(page);
    }
  });

  test('practice picker primary CTAs', async ({ page }) => {
    await page.goto('/practice', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Practice your way/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start untimed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start flashcards/i })).toBeVisible();
    for (const label of [
      /Research pipelines/i,
      /Extraction pipelines/i,
      /Customer support/i,
      /Code exploration/i,
    ]) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
    await noSevereHorizontalOverflow(page);
  });

  test('dashboard and leaderboard interactive chrome', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Your Dashboard/i })).toBeVisible({
      timeout: 15000,
    });
    await noSevereHorizontalOverflow(page);

    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Global Leaderboard/i })).toBeVisible({
      timeout: 15000,
    });
    const search = page.getByLabel(/Search scores/i);
    if (await search.count()) {
      await search.fill('nobody-mobile-xyz');
      await page.waitForTimeout(200);
    }
    const sort = page.locator('#leaderboard-sort');
    if (await sort.count()) {
      await sort.selectOption('recent');
    }
    await noSevereHorizontalOverflow(page);
  });

  test('marketing + learn pages load without overflow', async ({ page }) => {
    const pages: { path: string }[] = [
      { path: '/guide' },
      { path: '/faq' },
      { path: '/about' },
      { path: '/changelog' },
      { path: '/domains' },
      { path: '/sample-questions' },
      { path: '/score?score=820&passed=1&nickname=Mobile&archetype=Builder' },
    ];
    for (const p of pages) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      const mainText = (await page.locator('main').innerText()).trim();
      expect(mainText.length, `thin main on ${p.path}`).toBeGreaterThan(40);
      await noSevereHorizontalOverflow(page);
    }
  });

  test('all domain and sample-question domain pages', async ({ page }) => {
    for (const slug of DOMAIN_SLUGS) {
      await page.goto(`/domains/${slug}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      expect((await page.locator('main').innerText()).trim().length).toBeGreaterThan(80);
      await noSevereHorizontalOverflow(page);

      await page.goto(`/sample-questions/${slug}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      expect((await page.locator('main').innerText()).trim().length).toBeGreaterThan(80);
      await noSevereHorizontalOverflow(page);
    }
  });

  test('score card CTA and bug reporter on content page', async ({ page }) => {
    await page.goto('/score?score=720&passed=1&nickname=Audit&archetype=Orchestrator', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText('720')).toBeVisible();
    await expect(page.getByRole('link', { name: /Take the free mock/i })).toBeVisible();
    await noSevereHorizontalOverflow(page);

    await page.goto('/faq', { waitUntil: 'domcontentloaded' });
    const bug = page.getByRole('button', { name: /Report a bug/i });
    await expect(bug).toBeVisible();
    await bug.click();
    await expect(page.getByRole('heading', { name: /Report a Bug/i })).toBeVisible();
    await noSevereHorizontalOverflow(page);
  });

  test('menu and exam palette touch targets meet ~44px', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const menu = page.getByRole('button', { name: /Open menu/i });
    const menuBox = await menu.boundingBox();
    expect(menuBox!.width).toBeGreaterThanOrEqual(40);
    expect(menuBox!.height).toBeGreaterThanOrEqual(40);

    await page.goto('/exam', { waitUntil: 'domcontentloaded' });
    await waitForExamReady(page);
    const q1 = page.getByRole('complementary').getByRole('button', { name: /^Question 1(?:$|,)/ });
    const qBox = await q1.boundingBox();
    expect(qBox!.width).toBeGreaterThanOrEqual(40);
    expect(qBox!.height).toBeGreaterThanOrEqual(40);

    const next = page.getByRole('button', { name: 'Next', exact: true });
    const nextBox = await next.boundingBox();
    expect(nextBox!.height).toBeGreaterThanOrEqual(40);
  });
});
