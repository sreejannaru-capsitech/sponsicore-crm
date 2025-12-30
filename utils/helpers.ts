import { faker } from "@faker-js/faker";
import { expect, Locator, Page } from "@playwright/test";
import {
  formatCurrencyGBP,
  generateUkCompanyNumber,
  slashToHyphen,
} from "../utils/generators";

export async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(process.env.ADMIN_USERNAME);
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.locator("//span[normalize-space()='Login']").click(),
  ]);
}

export const closeNotification = async (page: Page) => {
  await page.locator("a.ant-notification-notice-close").click();
};

export const getUsername = (data: ContactFormData) => {
  return data.fullName.split(" ")[0] + ".official";
};

export const selectFirstResponse = async (page: Page) => {
  const firstResponse = faker.helpers.arrayElement([
    "Avik Sain",
    "Debanik Saha",
    "Himanshu Sharma",
    "Lead Manager",
    "Natasha Romanoff",
    "Sreejan Naru",
    "Subhajit Kar",
  ]);

  const dropdown = page.locator(".rc-virtual-list").filter({
    hasNotText: /Web|LLP|API/i,
  });

  await dropdown.evaluate(async (el, text) => {
    const container =
      el.querySelector(".rc-virtual-list-holder") ||
      el.querySelector(".ant-select-dropdown-content");

    if (!container) return;

    const findOption = () =>
      Array.from(el.querySelectorAll(".ant-select-item-option-content")).find(
        (n) => n.textContent?.trim() === text,
      );

    // 1. FIRST check without scrolling
    let option = findOption();
    if (option) {
      option.scrollIntoView({ block: "nearest" });
      return;
    }

    // 2. Then scroll and search
    let lastScrollTop = -1;

    while (container.scrollTop !== lastScrollTop) {
      lastScrollTop = container.scrollTop;
      container.scrollTop += 200;

      await new Promise((r) => setTimeout(r, 100));

      option = findOption();
      if (option) {
        option.scrollIntoView({ block: "nearest" });
        return;
      }
    }
  }, firstResponse);

  // Final click (Playwright side)
  await page
    .locator(".ant-select-item-option-content", { hasText: firstResponse })
    .first()
    .click();
};

export const businessChoose = async (page: Page, id: string) => {
  let companyNo: string;
  let success = false;
  const select = page.locator(`#${id}`);

  while (!success) {
    companyNo = generateUkCompanyNumber();
    // Open dropdown
    await select.click();
    // Clear previous input (important for AntD)
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");

    // Type new value
    await page.keyboard.type(companyNo);

    // Locator for option with exact text
    const option = page.getByRole("option", { name: companyNo });
    await page.waitForTimeout(300);

    if ((await option.count()) > 0) {
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      // Click Save
      await page.getByRole("button", { name: "Save" }).click();
      // Now check if company is already exists in portal
      if (await businessAlreadyExists(page)) {
        await closeNotification(page);
        continue; // Skip iteration and retry
      }
      success = true;
    } else {
      // Close dropdown before retry
      await page.keyboard.press("Escape");
    }
  }

  return companyNo;
};

export async function businessAlreadyExists(page: Page): Promise<boolean> {
  try {
    await page
      .locator(".ant-notification-notice-description", {
        hasText: "Business already exists",
      })
      .waitFor({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export const sendPaymentEmail = async (page: Page, isQuote: boolean) => {
  const trigger = page.locator("span.ant-dropdown-trigger").first();
  await trigger.hover();

  const menu = page.locator(".ant-dropdown-menu:visible");
  await menu.waitFor({ state: "visible" });

  await page
    .getByRole("menuitem", {
      name: isQuote ? "Send Email" : "Send Stripe Payment Mail",
    })
    .click();

  const sendButton = page.getByRole("button", { name: "Send", exact: true });
  await expect(sendButton).toBeEnabled();
  await sendButton.click();

  await expect(
    page.getByText(
      `${isQuote ? "Quote" : "Invoice payment"} email sent successfully`,
    ),
  ).toBeVisible({ timeout: 20000 });
};

export async function drawOnCanvas(page: Page, canvasSelector = "canvas") {
  const canvas = page.locator(canvasSelector);

  // Ensure canvas is visible and stable
  await canvas.scrollIntoViewIfNeeded();
  await canvas.waitFor({ state: "visible" });

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not visible");

  // Start INSIDE canvas with padding
  const startX = box.x + box.width * 0.2;
  const startY = box.y + box.height * 0.5;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // Keep all moves strictly inside canvas bounds
  await page.mouse.move(startX + box.width * 0.1, startY - 10, { steps: 5 });
  await page.mouse.move(startX + box.width * 0.2, startY + 10, { steps: 5 });
  await page.mouse.move(startX + box.width * 0.3, startY - 5, { steps: 5 });

  await page.mouse.up();
}

export const verifyPaymentInfo = async (
  page: Page,
  quote: QuoteType,
  data: QuoteData,
  isDrawer: boolean = true,
  isInvoice: boolean = false,
) => {
  // Calculations
  const subTotal = formatCurrencyGBP(data.amount);
  const vat = formatCurrencyGBP(data.amount * 0.2);
  const total = formatCurrencyGBP(data.amount * 0.2 + data.amount);

  // Date check
  await expect(
    page.getByText(
      `${isInvoice ? "Invoice" : "Quote"} Date: ${slashToHyphen(data.date)}`,
    ),
  ).toBeVisible();

  const subscription = ` (${slashToHyphen(data.start)} - ${slashToHyphen(data.end)})`;

  if (quote == "Expand") {
    const drawerText = `${quote} Team`;
    await expect(
      page.getByText(
        `${isDrawer ? drawerText : "Employee Add-on Plan"}${subscription}`,
      ),
    ).toBeVisible();
  } else if (quote == "Renew") {
    const drawerText = `${quote} Subscription`;
    await expect(
      page.getByText(
        `${isDrawer ? drawerText : "Subscription Renewal Plan"}${subscription}`,
      ),
    ).toBeVisible();
  } else {
    const drawerText = `${quote} Company`;
    await expect(
      page.getByText(
        `${isDrawer ? drawerText : "Subscription Plan"}${subscription}`,
      ),
    ).toBeVisible();
  }

  const entity = isDrawer ? page.getByRole("dialog") : page;

  // No. of employee
  await expect(entity.getByText(data.emp.toString()).first()).toBeVisible();
  // Money check
  await expect(entity.getByText(subTotal).first()).toBeVisible();
  await expect(entity.getByText(vat).first()).toBeVisible();
  await expect(entity.getByText(total).first()).toBeVisible();
};

export async function makeStripePayment(invoicePage: Page) {
  // Click "Proceed to Payment" and wait for Stripe to load (same tab)
  const stripeLink = invoicePage.getByRole("button", {
    name: "Proceed to Payment",
  });

  await expect(stripeLink).toBeVisible();

  await Promise.all([
    invoicePage.waitForNavigation({ waitUntil: "domcontentloaded" }),
    stripeLink.click({ force: true }),
  ]);

  const stripePage = invoicePage;

  // Ensure Stripe page is fully ready
  await stripePage.waitForLoadState("networkidle");

  // Fill email (outside iframe)
  await stripePage.locator("#email").fill("johndoe@example.com");

  // Stripe card iframe
  const cardFrame = stripePage.frameLocator(
    'iframe[name^="__privateStripeFrame"]',
  );

  // Fill card details
  await stripePage.locator("#cardNumber").fill("4242424242424242");
  await stripePage.locator("#cardExpiry").fill("1034");
  await stripePage.locator("#cardCvc").fill("561");
  await stripePage.locator("#billingName").fill("John Doe");

  // Click Pay / Confirm
  const payButton = stripePage.getByRole("button", {
    name: /pay|confirm|complete/i,
  });

  await expect(payButton).toBeEnabled();

  // Click Pay
  await Promise.allSettled([
    stripePage.waitForNavigation({ waitUntil: "domcontentloaded" }),
    payButton.click(),
  ]);
  const successPage = stripePage;
  // Wait for redirect to finish
  await successPage.waitForLoadState("networkidle");

  // Assert success
  await expect(successPage.getByText(/payment successful/i)).toBeVisible({
    timeout: 40_000,
  });
}

export async function checkPaymentHistory(
  page: Page,
  isQuote: boolean,
  amount: number,
  mode: "accept" | "marked" | "stripe" | "create",
  plan: QuoteType,
  emp: number = 0,
  remark: string = "Client gave us coins.",
) {
  await page.getByRole("tab", { name: "History" }).click();
  await page.reload({ waitUntil: "networkidle" });

  let planType: string;

  if (plan === "Create") planType = "Create Company";
  else if (plan === "Activate") planType = "Activate Company";
  else if (plan === "Expand") planType = "Expand Team";
  else planType = "Renew Subscription";

  const total = formatCurrencyGBP(amount * 0.2 + amount);

  if (isQuote) {
    if (mode === "accept") {
      await expect(page.getByText("Invoice Created:").first()).toBeVisible();
      await expect(page.getByText("Quote Accepted:").first()).toBeVisible();
      await expect(page.getByText(`- Plan: ${planType}`).first()).toBeVisible();
    } else if (mode === "create") {
      await expect(page.getByText("Quote Created:").first()).toBeVisible();
      await expect(page.getByText("- Status: Draft").first()).toBeVisible();
    }
  } else {
    if (mode === "create")
      await expect(page.getByText("Invoice Created:").first()).toBeVisible();
    else if (mode === "stripe")
      await expect(page.getByText("Invoice Paid:").first()).toBeVisible();
    else if (mode === "marked") {
      await expect(
        page.getByText("Invoice Marked as Paid:").first(),
      ).toBeVisible();
      await expect(page.getByText(`- Remark: ${remark}`).first()).toBeVisible();
    }

    await expect(page.getByText(`- Employees: ${emp}`).first()).toBeVisible();
    await expect(page.getByText(`- Plan: ${planType}`).first()).toBeVisible();
  }

  await expect(page.getByText(`Total Amount: ${total}`).first()).toBeVisible();
}
