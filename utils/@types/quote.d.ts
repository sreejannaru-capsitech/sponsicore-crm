type QuoteData = {
  date: string;
  start: string;
  end: string;
  emp: number;
  amount: number;
  isDiscount: boolean;
  discount: number;
  note: string;
};

type QuoteType = "Create" | "Renew" | "Activate" | "Expand";
