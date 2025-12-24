import { expect, Page } from "@playwright/test";
import { formatCurrencyGBP, slashToHyphen } from "../utils/generators";

export async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(process.env.ADMIN_USERNAME);
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.locator("//span[normalize-space()='Login']").click(),
  ]);
}

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
  await page
    .locator("span.ant-dropdown-trigger")
    .first()
    .click({ force: true });

  await page
    .locator(".ant-dropdown-menu")
    .getByText(isQuote ? "Send Email" : "Send Stripe Payment Mail", {
      exact: true,
    })
    .click();

  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: "Send", exact: true }).click();

  await expect(
    page.getByText(
      isQuote ? "Quote" : "Invoice payment" + " email sent successfully",
    ),
  ).toBeVisible({ timeout: 20000 });
};

export async function drawOnCanvas(page: Page, canvasSelector = "canvas") {
  const canvas = page.locator(canvasSelector);
  const box = await canvas.boundingBox();

  if (!box) throw new Error("Canvas not visible");

  const x = box.x + box.width / 4;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();

  await page.mouse.move(x + 40, y - 10, { steps: 4 });
  await page.mouse.move(x + 80, y + 10, { steps: 4 });
  await page.mouse.move(x + 120, y - 5, { steps: 4 });

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
