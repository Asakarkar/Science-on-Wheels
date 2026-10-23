export interface ConsumableItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitMetric: string;
  expiryDate?: string;
}

export interface InventoryTransaction {
  id: string;
  consumableId: string;
  busId?: string;
  quantity: number;
  type:
    | "RECEIPT"
    | "ISSUE"
    | "RETURN"
    | "TRANSFER"
    | "ADJUSTMENT"
    | "DAMAGE"
    | "LOSS"
    | "CONSUMPTION";
  timestamp: string;
  notes?: string;
}

export function isLowStock(item: ConsumableItem): boolean {
  return item.currentStock <= item.minimumStock;
}
