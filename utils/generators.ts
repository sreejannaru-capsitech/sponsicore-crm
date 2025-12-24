import { faker } from "@faker-js/faker";

export function generateContactFormData(): ContactFormData {
  const firstName = faker.person.firstName().replace(/[^A-Za-z]/g, "");
  const lastName = faker.person.lastName().replace(/[^A-Za-z]/g, "");

  return {
    fullName: `${firstName} ${lastName}`,
    company: faker.company.name(),
    email: `${firstName.toLowerCase()}.official@chitthi.in`,
    phone: `90${faker.number.int({ min: 6000000000, max: 9999999999 })}`,
    employees: faker.number.int({ min: 1, max: 500 }).toString(),
    message: faker.lorem.sentence(6),
  };
}

export const trueFalse = () => {
  return faker.datatype.boolean();
};

export function formatDateTime(): string {
  const now = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(now.getDate() + 14);

  // random timestamp between now and +14 days
  const randomTime =
    now.getTime() + Math.random() * (twoWeeksLater.getTime() - now.getTime());

  const date = new Date(randomTime);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;
}

export function generateUkCompanyNumber(): string {
  const firstDigit = faker.helpers.arrayElement(["0", "1"]);
  const rest = faker.string.numeric(7);

  return firstDigit + rest;
}

export function getDateDDMMYYYY(
  direction: "past" | "future",
  daysRange = 14,
): string {
  const date = new Date();

  const offset =
    Math.floor(Math.random() * daysRange) * (direction === "future" ? 1 : -1);

  date.setDate(date.getDate() + offset);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function formatCurrencyGBP(amount: number): string {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Insert a space after £
  return formatted.replace("£", "£ ");
}

export function slashToHyphen(date: string): string {
  return date.replace(/\//g, "-");
}
