import { expect, test } from "@playwright/test";
import { faker } from "@faker-js/faker";

import { Browser } from "@playwright/test";

type TempMailOptions = {
  username: string;
  domain?: string;
  otpLength?: number;
};

export type ContactFormData = {
  fullName: string;
  company: string;
  email: string;
  phone: string;
  employees?: string;
  message: string;
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

export function generateContactFormData(): ContactFormData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    fullName: `${firstName} ${lastName}`,
    company: faker.company.name(),
    email: `${firstName.toLowerCase()}.official@chitthi.in`,
    phone: `90${faker.number.int({ min: 6000000000, max: 9999999999 })}`,
    employees: faker.number.int({ min: 1, max: 500 }).toString(),
    message: faker.lorem.sentence(6),
  };
}

test.describe("Website Lead Creation", () => {
  const pageURL = process.env.WEBSITE_URL;

  test("Create Contact Query", async ({ page }) => {
    await page.goto(`${pageURL}/contact`);

    const data = generateContactFormData();

    await page.locator("#name").fill(data.fullName);
    await page.locator("#company").fill(data.company);
    await page.locator("#total_employee").fill(data.employees!);
    await page.locator("#email").fill(data.email);
    await page.locator("input[type='tel']").fill(data.phone);
    await page.locator("#message").fill(data.message);

    await page.getByRole("button", { name: "Submit" }).click();

    // Success message should be visible.
    await expect(page.getByText("Success")).toBeVisible();
  });

  test("Create Pricing Query", async ({ page, browser }) => {
    await page.goto(pageURL);
    await page.getByRole("button", { name: "Get Started" }).click();

    const data = generateContactFormData();

    await page.locator("#full_name").fill(data.fullName);
    await page.locator("#company_name").fill(data.company);
    await page.locator("#email").fill(data.email);
    await page.locator("input[type='tel']").fill(data.phone);
    await page.locator("#message").fill(data.message);

    await page.getByRole("button", { name: "Submit" }).click();

    // Verify button should be visible.
    const verifyButton = page.getByRole("button", { name: "Verify" });
    await expect(verifyButton).toBeVisible();

    const otp = await readOtpFromTempmail(browser, {
      username: data.fullName.split(" ")[0] + ".official",
    });

    // Switch back to app
    await page.bringToFront();
    await page.locator("input[name='otp']").fill(otp);
    await verifyButton.click();

    // Pricing plan options should be visible
    await expect(page.getByText("Sponsicore Pricing Plans")).toBeVisible();

    // Choose plan
    const decision = faker.datatype.boolean();
    if (decision) {
      // Annual Plan
      await page.getByText("Proceed to Pay").click();
    } else {
      // Custom plan
      await page.getByText("Let us know").click();
      // Thank you should be visible.
      await expect(page.getByText("Thank you for your response")).toBeVisible();
    }
  });

  test("Create Compliance Test", async ({ page, browser }) => {
    const ids = [
      "69038bea19584533a7499102",
      "69048af7f445421540ffe980",
      "690492b4f445421540ffe9b3",
      "690496b9f445421540ffe9c5",
      "69049785f445421540ffe9cb",
      "69049a23f445421540ffe9dd",
      "69049e0df445421540ffe9f2",
      "6904a3645d38f9752e68fc97",
      "6904a4075d38f9752e68fc9b",
      "6904a50a5d38f9752e68fc9e",
      "690839069c16834787b27b4f",
      "6926b281071a64e32132ecaf",
      "6926f37e127b69b41dd809c2",
      "6926f396127b69b41dd809c9",
      "6926f44e127b69b41dd809eb",
      "69280c8898233e759a78f7d5",
      "694141061e55626212850e07",
    ];
    // Randomly choose a compaign
    const compaign = faker.helpers.arrayElement(ids);
    const url = `${process.env.PORTAL_URL}/compliance-test/${compaign}`;

    await page.goto(url);

    const data = generateContactFormData();
    await page.locator("#login_name").fill(data.fullName);
    await page.locator("#login_email").fill(data.email);
    await page.locator("input[type='tel']").fill(data.phone);
    // Hit Submit
    await page.getByRole("button", { name: "Submit" }).click();
    const otp = await readOtpFromTempmail(browser, {
      username: data.fullName.split(" ")[0] + ".official",
    });

    const digits = otp.split("");
    for (let i = 0; i < digits.length; i++) {
      await page.locator(`#Otp${i + 1}`).fill(digits[i]);
    }

    const verifyButton = page.getByRole("button", { name: "Verify" });
    await verifyButton.click();

    // Should open form
    await expect(page.getByText("Company Information")).toBeVisible();

    await page
      .locator("#survey-questions-form_basicInfoFirst")
      .fill(data.company);

    // Total Employee count
    const totalEmp = faker.number.int({ max: 500, min: 10 });
    await page
      .locator("#survey-questions-form_basicInfoSecond")
      .fill(totalEmp.toString());

    // Sponsored employee count
    await page
      .locator("#survey-questions-form_basicInfoThird")
      .fill(faker.number.int({ max: totalEmp, min: 10 }).toString());

    await page.getByRole("button", { name: "Save & Next" }).click();

    // Should redirect to Questions page
    await expect(page.getByText("Questions 1/8")).toBeVisible();
  });
});
