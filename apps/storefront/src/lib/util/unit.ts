const UNIT_LABELS: Record<string, { singular: string; plural: string }> = {
  kg: { singular: "kg", plural: "kg" },
  piece: { singular: "piece", plural: "pieces" },
  bundle: { singular: "bundle", plural: "bundles" },
  tray: { singular: "tray", plural: "trays" },
  sack: { singular: "sack", plural: "sacks" },
}

export function getUnitLabel(unit: string | undefined, quantity: number = 1): string {
  const labels = UNIT_LABELS[unit ?? "kg"] ?? { singular: unit ?? "kg", plural: unit ?? "kg" }
  return quantity === 1 ? labels.singular : labels.plural
}

export function getProductUnit(product: { metadata?: Record<string, unknown> | null }): string {
  return (product.metadata?.unit as string) ?? "kg"
}
