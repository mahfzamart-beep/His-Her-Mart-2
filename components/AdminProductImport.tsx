"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type Category = { id: string; name: string; slug: string };
type Props = { categories: Category[]; onImported: () => Promise<void> };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(v => v !== "")) rows.push(row);
  return rows;
}

export default function AdminProductImport({ categories, onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");

  function downloadTemplate() {
    const csv = [
      "name,sku,category_slug,description,price,compare_at_price,stock_quantity,image_url,is_active,is_featured,fulfillment_source,supplier_product_code,supplier_product_url,free_shipping_eligible",
      '"Example Linen Shirt","HHM-NEW-001","mens-fashion","Cotton blend shirt",1290,1590,20,"https://example.com/image.jpg",true,false,"own_stock","","",false'
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "his-her-mart-products-template.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    setReport("");
    if (!supabase) { setReport("Supabase is not configured."); return; }
    if (file.size > 2 * 1024 * 1024) { setReport("CSV file is too large (maximum 2 MB)."); return; }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setReport("The CSV file has no product rows."); return; }
    const headers = rows[0].map(h => h.trim().toLowerCase());
    if (["name", "price", "stock_quantity"].some(h => !headers.includes(h))) { setReport("Required columns: name, price, stock_quantity."); return; }
    if (rows.length - 1 > 500) { setReport("Maximum 500 products per import file."); return; }

    const get = (r: string[], key: string) => r[headers.indexOf(key)] ?? "";
    const categoryMap = new Map<string, string>();
    categories.forEach(c => { categoryMap.set(c.slug.toLowerCase(), c.id); categoryMap.set(c.name.toLowerCase(), c.id); });
    const payload: any[] = [];
    const issues: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const name = get(r, "name").trim();
      const price = Number(get(r, "price"));
      const stock = Number(get(r, "stock_quantity"));
      const compareRaw = get(r, "compare_at_price");
      const compare = compareRaw === "" ? null : Number(compareRaw);
      if (name.length < 2 || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (compare !== null && (!Number.isFinite(compare) || compare < price))) {
        issues.push("Row " + (i + 1) + ": invalid name, price, stock or compare-at price."); continue;
      }
      const source = get(r, "fulfillment_source") || "own_stock";
      if (!["own_stock", "shopbase_bd", "dropshippingbd"].includes(source)) { issues.push("Row " + (i + 1) + ": invalid fulfillment source."); continue; }
      const categoryText = get(r, "category_slug").toLowerCase();
      const categoryId = categoryText ? categoryMap.get(categoryText) : null;
      if (categoryText && !categoryId) { issues.push("Row " + (i + 1) + ": category name or slug was not found."); continue; }
      const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
      payload.push({
        name, slug: slugBase + "-" + crypto.randomUUID().slice(0, 6),
        sku: get(r, "sku") || null, description: get(r, "description") || null,
        category_id: categoryId, price, compare_at_price: compare, stock_quantity: stock,
        image_url: get(r, "image_url") || null,
        is_active: get(r, "is_active") === "" ? true : get(r, "is_active").toLowerCase() === "true",
        is_featured: get(r, "is_featured").toLowerCase() === "true",
        fulfillment_source: source, supplier_product_code: get(r, "supplier_product_code") || null,
        supplier_product_url: get(r, "supplier_product_url") || null,
        free_shipping_eligible: get(r, "free_shipping_eligible").toLowerCase() === "true"
      });
    }

    if (!payload.length) { setReport("No valid rows found. " + issues.slice(0, 8).join("\n")); return; }
    setBusy(true);
    let imported = 0;
    for (let i = 0; i < payload.length; i += 25) {
      const { error } = await supabase.from("products").insert(payload.slice(i, i + 25));
      if (error) { issues.push("Import stopped after " + imported + " products: " + error.message); break; }
      imported += Math.min(25, payload.length - i);
    }
    await onImported();
    setReport("Imported " + imported + " product(s)." + (issues.length ? "\nIssues:\n" + issues.slice(0, 12).join("\n") : ""));
    setBusy(false);
  }

  return <div className="admin-product-import">
    <button type="button" onClick={downloadTemplate}>Download CSV template</button>
    <label>Import products CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file); e.currentTarget.value = ""; }} /></label>
    <small>Up to 500 products per file. Use an existing category name or slug. Duplicate SKUs are rejected by the database.</small>
    {busy && <small>Importing products…</small>}
    {report && <div className="admin-import-report" role="status">{report}</div>}
  </div>;
}
