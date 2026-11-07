"use client";

import { useState } from "react";
import { ArrowDownToLine, ExternalLink, Link2, Sparkles, X } from "lucide-react";

export type ShopBaseImportedProduct = {
  name: string;
  originalDescription: string;
  premiumDescription: string;
  images: string[];
  supplierPrice: number | null;
  currency: string;
  sku: string;
  colors: string[];
  sizes: string[];
  category: string;
  stockQuantity: number | null;
  sourceUrl: string;
  aiModel: string;
};

type Props = {
  accessToken: string;
  onDraftReady: (product: ShopBaseImportedProduct) => void;
};

export default function AdminShopBaseImporter({ accessToken, onDraftReady }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ShopBaseImportedProduct | null>(null);

  async function scanProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setProduct(null);
    try {
      const response = await fetch("/api/admin/import-shopbase-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Could not import this product.");
      if (!result?.product?.name || !Array.isArray(result.product.images)) {
        throw new Error("The importer returned incomplete product information.");
      }
      setProduct(result.product as ShopBaseImportedProduct);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product import failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setError("");
    setProduct(null);
  }

  return <>
    <button type="button" className="admin-shopbase-import-btn" onClick={() => setOpen(true)}>
      <ArrowDownToLine size={15} /> Import from ShopBase BD
    </button>

    {open && <div className="admin-modal-backdrop" onClick={close}>
      <section className="admin-order-modal admin-product-editor admin-shopbase-import-modal" onClick={event => event.stopPropagation()}>
        <div className="admin-modal-head">
          <div>
            <p className="eyebrow">SUPPLIER PRODUCT IMPORT</p>
            <h2>Import from ShopBase BD</h2>
            <small>Paste a product link. We’ll collect the product details and write a premium English description.</small>
          </div>
          <button type="button" onClick={close} aria-label="Close importer"><X size={18}/></button>
        </div>

        <form className="admin-product-form" onSubmit={scanProduct}>
          <label>ShopBase BD product URL
            <input type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://shopbasebd.com/…" />
            <small>Only HTTPS links from shopbasebd.com are accepted. Private/login-only pages may not be readable.</small>
          </label>
          <button type="submit" className="admin-product-add" disabled={busy || !url.trim()}>
            {busy ? "Scanning product and writing description…" : "Scan product"}
            {!busy && <Sparkles size={15}/>}
          </button>
        </form>

        {busy && <div className="admin-shopbase-import-progress" role="status">
          <span className="admin-import-spinner"/>
          <div><b>Reading supplier page</b><small>Extracting product details, images, sizes and colours, then preparing the English description.</small></div>
        </div>}

        {error && <p className="admin-error admin-shopbase-error" role="alert">{error}</p>}

        {product && <div className="admin-shopbase-preview">
          <div className="admin-shopbase-preview-head">
            <span className="admin-product-live"><Sparkles size={12}/> Import preview ready</span>
            <a href={product.sourceUrl} target="_blank" rel="noreferrer">Source page <ExternalLink size={12}/></a>
          </div>
          <div className="admin-shopbase-product-preview">
            {product.images[0] && <img src={product.images[0]} alt={product.name}/>}
            <div>
              <b>{product.name}</b>
              <small>{product.sku ? "Supplier SKU: " + product.sku : "Supplier SKU not found"}</small>
              <small>{product.category || "Supplier category not found"}</small>
            </div>
          </div>
          <div className="admin-shopbase-metrics">
            <div><small>Supplier cost</small><b>{product.supplierPrice === null ? "Not detected" : "৳" + product.supplierPrice.toLocaleString("en-BD")}</b></div>
            <div><small>Stock from supplier page</small><b>{product.stockQuantity === null ? "Not shown" : product.stockQuantity}</b></div>
            <div><small>Images found</small><b>{product.images.length}</b></div>
          </div>
          {(product.colors.length > 0 || product.sizes.length > 0) && <div className="admin-shopbase-variants">
            {product.colors.length > 0 && <div><small>Colours detected</small><p>{product.colors.join(" · ")}</p></div>}
            {product.sizes.length > 0 && <div><small>Sizes detected</small><p>{product.sizes.join(" · ")}</p></div>}
          </div>}
          <div className="admin-shopbase-description">
            <b>Premium English description</b>
            <p>{product.premiumDescription}</p>
          </div>
          {product.originalDescription && <details className="admin-shopbase-original">
            <summary>View original supplier description</summary>
            <p>{product.originalDescription}</p>
          </details>}
          <p className="admin-shopbase-note">The product will be saved as a draft. Review supplier cost, selling price, stock, sizes and colours before publishing. Supplier stock is not live-synced.</p>
          <button type="button" className="admin-product-add admin-shopbase-use-btn" onClick={() => { onDraftReady(product); setOpen(false); setProduct(null); }}>
            Use imported details &amp; set my price
          </button>
        </div>}
      </section>
    </div>}
  </>;
}
