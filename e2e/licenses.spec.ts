import { expect, test } from 'e2e/utils';
import { randomString } from 'remeda';

test.describe('Redeem code management as manager', () => {
  test('copies, edits, and deletes a redeem code', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const uniqueId = randomString(8);
    const ownerEmail = `redeem-${uniqueId}@example.com`;

    await page.to('/login');
    await page.login({ email: 'admin@tachi-back.local' });
    await page.waitForURL('/manager');
    await page.to('/manager/licenses');
    await page.getByRole('button', { name: 'Generate redeem' }).click();
    await page.getByLabel('Owner email').fill(ownerEmail);
    await page.getByLabel('Tokens').fill('1234');
    await page.getByLabel('Device limit').fill('1');
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByText(/Redeem generated:/)).toBeVisible();

    await page.getByPlaceholder('Search code, email, license').fill(ownerEmail);
    await expect(page.getByText(ownerEmail)).toBeVisible();

    const row = page
      .getByText(ownerEmail)
      .locator('xpath=ancestor::div[contains(@class, "border-b")][1]');
    const copyButton = row.getByRole('button', {
      name: /Copy redeem code TB-/,
    });
    const redeemCode = (await copyButton.textContent())?.trim() ?? '';
    expect(redeemCode).toMatch(/^TB-/);
    await copyButton.click();
    await expect(page.getByText('Redeem copied to clipboard.')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(redeemCode);

    await page
      .getByRole('button', { name: `Actions for ${redeemCode}` })
      .click();
    await page.getByRole('menuitem', { name: 'Edit redeem' }).click();
    await page.getByLabel('Token delta').fill('250');
    await page.getByLabel('License status').selectOption('suspended');
    await page.getByLabel('Adjustment note').fill('E2E token adjustment');
    await page.getByRole('button', { name: 'Save changes' }).click({
      force: true,
    });
    await expect(page.getByText(/Redeem updated/)).toBeVisible();
    await expect(page.getByText(/suspended/)).toBeVisible();
    await expect(page.getByText('1,484 total credited')).toBeVisible();

    await page
      .getByRole('button', { name: `Actions for ${redeemCode}` })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(
      page.getByRole('heading', { name: `Delete ${redeemCode}?` })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Delete redeem' }).click();
    await expect(page.getByText('Redeem deleted.')).toBeVisible();
    await expect(
      page.getByText(`No results for "${ownerEmail}"`)
    ).toBeVisible();
  });
});
