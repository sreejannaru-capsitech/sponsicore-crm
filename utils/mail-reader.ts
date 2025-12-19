import { Browser } from "@playwright/test";

export type TempMailOptions = {
  username: string;
  domain?: string;
  otpLength?: number;
};

export async function readOtpFromTempmail(
  browser: Browser,
  options: TempMailOptions,
): Promise<string> {
  const { username, domain = "chitthi.in", otpLength = 4 } = options;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://tempmail.plus/en/#!");

    // Set username
    await page.locator("#pre_button").fill(username);

    // Select domain
    await page.locator("#domain").click();
    await page.getByRole("button", { name: domain }).click();
    await page.locator("#pre_copy").click();

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
