import { Browser, expect } from "@playwright/test";
import { drawOnCanvas, verifyPaymentInfo } from "./helpers";

export async function openInbox(browser: Browser, options: TempMailOptions) {
  const { username, domain = "chitthi.in" } = options;

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://tempmail.plus/en/#!");

  // Set username
  await page.locator("#pre_button").fill(username);

  // Select domain
  await page.locator("#domain").click();
  await page.getByRole("button", { name: domain }).click();
  await page.locator("#pre_copy").click();

  return { page, context };
}

export async function readOtpFromTempmail(
  browser: Browser,
  options: TempMailOptions,
): Promise<string> {
  const { page, context } = await openInbox(browser, options);
  const { otpLength = 4 } = options;

  try {
    // Open latest email
    await page.getByText("Verification Code").click();

    // Read OTP
    const otp = (
      await page
        .locator("p", {
          hasText: new RegExp(`^\\d{${otpLength}}$`),
        })
        .innerText()
    ).trim();

    return otp;
  } finally {
    await context.close();
  }
}

export async function acceptQuoteTempmail(
  browser: Browser,
  options: TempMailOptions,
  data: QuoteData,
  quote: QuoteType,
) {
  const { page, context } = await openInbox(browser, options);
  try {
    // Open latest email
    await page.getByText("Quotation for").first().click();

    // --- CLICK + CAPTURE REDIRECT ---
    const [newPage] = await Promise.allSettled([
      context.waitForEvent("page"), // new tab
      page.getByText("Accept Quotation").click({ force: true }),
    ]);

    // Determine where we landed
    const quotePage = newPage.status === "fulfilled" ? newPage.value : page;

    // Wait for final redirect page to load
    await quotePage.waitForLoadState("domcontentloaded");

    await verifyPaymentInfo(quotePage, quote, data, false, false);

    // Accept the Quote
    await quotePage.getByRole("button", { name: "Accept" }).click();

    await drawOnCanvas(quotePage);

    await quotePage.getByRole("button", { name: "Save" }).click();

    await expect(
      quotePage.getByText("Quote accepted successfully"),
    ).toBeVisible();
  } finally {
    await context.close();
  }
}
