"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowDownToLine, Sparkles, X, ImagePlus, UploadCloud, ExternalLink } from "lucide-react";

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
  onUploadImages: (files: File[]) => Promise<string[]>;
};

export default function AdminShopBaseImporter({ accessToken, onDraftReady, onUploadImages }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ShopBaseImportedProduct | null>(null);

  function chooseImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    if (selected.length > 12) {
      setError("Choose up to 12 product images.");
      return;
    }
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Use JPG, PNG or WebP images only.");
      return;
    }
    if (selected.some(file => file.size > 5 * 1024 * 1024)) {
      setError("Each image must be 5 MB or smaller.");
      return;
    }
    setFiles(selected);
    setError("");
    setProduct(null);
  }

  async function scanProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setProduct(null);
    try {
      if (name.trim().length < 2) throw new Error("Enter the product name.");
      const cost = Number(supplierPrice);
      if (!supplierPrice.trim() || !Number.isFinite(cost) || cost < 0) {
        throw new Error("Enter a valid non-negative supplier price in BDT.");
      }
      if (description.trim().length < 5) throw new Error("Paste the supplier product description.");
      if (files.length === 0) throw new Error("Upload at least one product image.");

      const imageUrls = await onUploadImages(files);
      if (!imageUrls.length) throw new Error("No product images were uploaded. Please try again.");

      const response = await fetch("/api/admin/import-shopbase-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({
          mode: "manual",
          name: name.trim(),
          supplierPrice: cost,
          originalDescription: description.trim(),
          images: imageUrls,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Could not prepare this product.");
      if (!result?.product?.name || !Array.isArray(result.product.images) || !result.product.premiumDescription) {
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
      <ArrowDownToLine size={15} /> Manual supplier import
    </button>

    {open && <div className="admin-modal-backdrop" onClick={close}>
      <section className="admin-order-modal admin-product-editor admin-shopbase-import-modal" onClick={event => event.stopPropagation()}>
        <div className="admin-modal-head">
          <div>
            <p className="eyebrow">SUPPLIER PRODUCT IMPORT</p>
            <h2>Prepare a ShopBase BD Product</h2>
            <small>Copy the details while signed in to ShopBase BD, then add them here. We will create the English description and prepare an unpublished draft.</small>
          </div>
          <button type="button" onClick={close} aria-label="Close importer"><X size={18}/></button>
        </div>

        <form className="admin-product-form" onSubmit={scanProduct}>
          <label>Product name
            <input type="text" required maxLength={140} value={name} onChange={event => setName(event.target.value)} placeholder="Enter the exact supplier product name" />
          </label>
          <label>Supplier price (BDT)
            <input type="number" required min="0" step="0.01" value={supplierPrice} onChange={event => setSupplierPrice(event.target.value)} placeholder="e.g. 450" />
          </label>
          <label>Supplier description
            <textarea required minLength={5} maxLength={5000} rows={6} value={description} onChange={event => setDescription(event.target.value)} placeholder="Paste the original product description from ShopBase BD" />
            <small>Bangla or English supplier text is accepted. The AI will rewrite it in polished English without inventing product claims.</small>
          </label>
          <label>Product images
            <span className="admin-shopbase-image-picker">
              <ImagePlus size={18}/> Choose product photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} />
            </span>
            <small>{files.length ? files.length + " image(s) selected. Maximum 12 images; JPG, PNG or WebP, up to 5 MB each." : "Upload up to 12 product photos from your device. Images will be saved to the store's product image storage."}</small>
            {files.length > 0 && <small>{files.map(file => file.name).join(" · ")}</small>}
          </label>
          <button type="submit" className="admin-product-add" disabled={busy}>
            {busy ? "Uploading photos and writing description…" : "Generate English description"}
            {!busy && <Sparkles size={15}/>}
          </button>
        </form>

        {busy && <div className="admin-shopbase-import-progress" role="status">
          <span className="admin-import-spinner"/>
          <div><b>Preparing your product</b><small>Uploading product images and rewriting the supplier description in English.</small></div>
        </div>}

        {error && <p className="admin-error admin-shopbase-error" role="alert">{error}</p>}

        {product && <div className="admin-shopbase-preview">
          <div className="admin-shopbase-preview-head">
            <span className="admin-product-live"><Sparkles size={12}/> Import preview ready</span>
            <span>Manual supplier details</span>
          </div>
          <div className="admin-shopbase-product-preview">
            {product.images[0] && <img src={product.images[0]} alt={product.name}/>}
            <div>
              <b>{product.name}</b>
              <small>Supplier SKU can be added in product editor</small>
              <small>ShopBase BD</small>
            </div>
          </div>
          <div className="admin-shopbase-metrics">
            <div><small>Supplier cost</small><b>{product.supplierPrice === null ? "Not detected" : "৳" + product.supplierPrice.toLocaleString("en-BD")}</b></div>
            <div><small>Stock from supplier</small><b>Not provided</b></div>
            <div><small>Images uploaded</small><b>{product.images.length}</b></div>
          </div>
          <div className="admin-shopbase-description">
            <b>Premium English description</b>
            <p>{product.premiumDescription}</p>
          </div>
          {product.originalDescription && <details className="admin-shopbase-original">
            <summary>View original supplier description</summary>
            <p>{product.originalDescription}</p>
          </details>}
          <p className="admin-shopbase-note">This opens the product editor as an unpublished draft. Set your own selling price, stock and any size or colour options before saving or publishing.</p>
          <button type="button" className="admin-product-add admin-shopbase-use-btn" onClick={() => { onDraftReady(product); setOpen(false); setProduct(null); }}>
            Use details &amp; set my selling price
          </button>
        </div>}
      </section>
    </div>}
  </>;
}
