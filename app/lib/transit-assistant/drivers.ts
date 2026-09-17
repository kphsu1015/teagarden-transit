// 在地包車司機聯絡資訊。這是民宿業者直接提供的真實聯絡方式，屬於固定事實資料，
// 跟班次資料一樣不經過 OpenAI 改寫 —— 只有查詢完全沒有班次、且旅客明確同意要看聯絡方式時，
// 才由 answer-builder.ts 依這裡的資料原樣輸出，不會被模型臆測或改動內容。

export interface DriverContact {
  name: string;
  area: string;
  phone: string;
  lineId?: string;
  whatsapp?: string;
}

export const CHARTER_DRIVERS: DriverContact[] = [
  { name: "林先生", area: "奮起湖在地司機", phone: "0920353559" },
  { name: "許先生", area: "嘉義市司機", phone: "0980478335", lineId: "jr741212", whatsapp: "+886980478335" },
];
