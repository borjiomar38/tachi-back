import type { Page } from '@playwright/test';
import { expect, test } from 'e2e/utils';
import { ADMIN_FILE } from 'e2e/utils/constants';
import { randomString } from 'remeda';

test.describe('Redeem code management as manager', () => {
  test.use({ storageState: ADMIN_FILE });

  test('copies, edits, and deletes a redeem code', async ({
    browserName,
    page,
    context,
  }) => {
    test.slow();
    test.skip(
      browserName !== 'chromium',
      'Clipboard-backed redeem actions are covered in Chromium.'
    );

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const uniqueId = randomString(8);
    const ownerEmail = `redeem-${uniqueId}@example.com`;

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

    await selectRedeemAction(page, redeemCode, 'Edit redeem');
    await expect(
      page.getByRole('dialog', { name: 'Edit redeem' })
    ).toBeVisible();
    await page.getByLabel('Token delta').fill('250');
    await page.getByLabel('License status').selectOption('suspended');
    await page.getByLabel('Adjustment note').fill('E2E token adjustment');
    await page.getByRole('button', { name: 'Save changes' }).click({
      force: true,
    });
    await expect(page.getByText(/Redeem updated/)).toBeVisible();
    await expect(
      page.getByRole('dialog', { name: 'Edit redeem' })
    ).toBeHidden();
    const updatedRow = page
      .getByText(ownerEmail)
      .locator('xpath=ancestor::div[contains(@class, "border-b")][1]');
    await expect(updatedRow.getByText(/suspended/)).toBeVisible();
    await expect(updatedRow.getByText('1,484 total credited')).toBeVisible();

    await selectRedeemAction(page, redeemCode, 'Delete');
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

async function selectRedeemAction(
  page: Page,
  redeemCode: string,
  actionName: string
) {
  const actionButton = page.getByRole('button', {
    name: `Actions for ${redeemCode}`,
  });
  await actionButton.scrollIntoViewIfNeeded();
  await actionButton.click({ force: true });

  const menuItem = page.getByRole('menuitem', { name: actionName });
  await expect(menuItem).toBeVisible();
  await menuItem.dispatchEvent('click');
}
