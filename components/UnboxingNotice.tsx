"use client";

type UnboxingNoticeProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  showConsent?: boolean;
};

export default function UnboxingNotice({
  checked = false,
  onCheckedChange,
  showConsent = true,
}: UnboxingNoticeProps) {
  return (
    <section className="unboxing-notice" aria-labelledby="unboxing-notice-title">
      <div className="notice-teacher" aria-label="Momo order care tip">
        <div className="notice-food-icon" aria-hidden="true">🥟</div>
        <span className="teacher-label">A little care, please!</span>
      </div>

      <div className="unboxing-copy">
        <p className="eyebrow">YOUR ORDER · QUICK CHECK</p>
        <h3 id="unboxing-notice-title">A quick video helps us help you.</h3>
        <p className="notice-english">
          When your momo order arrives, use your phone camera to start one continuous video
          <strong> before opening the food pack</strong>. Show the sealed pack and order label,
          then the opening and the items inside. This helps our team review reports of a damaged,
          incorrect or missing item.
        </p>
        <p className="notice-bangla" lang="bn">
          আপনার Cloud Momos অর্ডার হাতে পেলে ফোনের ক্যামেরা দিয়ে
          <strong> খাবারের প্যাকেট খোলার আগেই</strong> একটানা ভিডিও রেকর্ড করুন।
          ভিডিওতে সিল করা প্যাকেট ও অর্ডার লেবেল, প্যাকেট খোলা এবং ভেতরের খাবার দেখান।
          অর্ডারে কোনো খাবার কম, ভুল বা নষ্ট অবস্থায় এলে বিষয়টি যাচাই করতে ভিডিওটি আমাদের সাহায্য করবে।
        </p>
        <div className="notice-food-steps">
          <span><b>01</b> Keep the pack sealed</span>
          <span><b>02</b> Record while opening</span>
          <span><b>03</b> Contact support if there’s an issue</span>
        </div>
        <p className="notice-legal">
          This website does not record or upload video from your camera. Keep the video on your phone
          and share it with our support team on WhatsApp if you need help.
          <span lang="bn"> ওয়েবসাইট নিজে ভিডিও রেকর্ড বা আপলোড করে না। প্রয়োজন হলে ফোনে রাখা ভিডিওটি WhatsApp-এ আমাদের সাপোর্ট টিমকে পাঠান।</span>
        </p>
        <a className="notice-support-link" href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">
          WhatsApp Cloud Momos support · +8801969419302
        </a>
        {showConsent && (
          <label className="policy-consent">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onCheckedChange?.(event.target.checked)}
            />
            <span>
              I have read the food-pack video-check instructions.
              <span lang="bn"> খাবারের প্যাকেট খোলার ভিডিও নির্দেশনাটি পড়েছি।</span>
            </span>
          </label>
        )}
      </div>
    </section>
  );
}
