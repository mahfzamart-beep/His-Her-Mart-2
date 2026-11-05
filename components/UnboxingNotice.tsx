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
      <div className="notice-teacher" aria-label="Animated Bangladeshi teacher character">
        <svg viewBox="0 0 180 190" role="img" aria-labelledby="teacher-title">
          <title id="teacher-title">A friendly Bangladeshi teacher</title>
          <ellipse cx="90" cy="178" rx="57" ry="8" fill="#e9dfcf" />
          <path d="M35 184c3-35 23-52 55-52s52 17 55 52" fill="#e97834" />
          <path d="M65 139l25 24 25-24 17 45H48z" fill="#f7e9d4" />
          <path d="M55 144c13 8 23 14 35 14s22-6 35-14l9 40H46z" fill="#d9651e" />
          <path d="M76 120h28v28c-8 8-20 8-28 0z" fill="#bd805e" />
          <path d="M47 57c0-27 17-44 43-44 29 0 45 19 43 49l-4 41c-3 22-21 38-39 38-23 0-39-18-42-39z" fill="#28211e" />
          <circle cx="42" cy="83" r="10" fill="#bd805e" />
          <circle cx="138" cy="83" r="10" fill="#bd805e" />
          <path d="M52 65c0-25 16-42 39-42 24 0 39 17 39 43v31c0 25-17 43-39 43S52 121 52 97z" fill="#d99a75" />
          <path d="M50 72c1-33 16-53 43-53 22 0 41 15 43 48-10-5-17-13-22-24-12 14-34 21-64 20z" fill="#28211e" />
          <path d="M55 48c-4-13 7-29 24-34 22-7 45 1 55 18 4 8 4 18 1 26-10-5-18-13-22-22-13 12-33 18-58 18z" fill="#28211e" />
          <path d="M130 38c18-3 22 14 10 27-5 5-11 7-16 6" fill="none" stroke="#28211e" strokeWidth="7" strokeLinecap="round" />
          <path d="M62 77c7-5 14-5 21-1M99 76c7-4 14-4 20 1" fill="none" stroke="#432b25" strokeWidth="3.5" strokeLinecap="round" />
          <g className="teacher-eyes">
            <ellipse cx="73" cy="88" rx="4.6" ry="6.3" fill="#2b211e" />
            <ellipse cx="109" cy="88" rx="4.6" ry="6.3" fill="#2b211e" />
            <circle cx="74.5" cy="86" r="1.5" fill="#fff" />
            <circle cx="110.5" cy="86" r="1.5" fill="#fff" />
          </g>
          <path d="M60 80c9-8 19-8 28-1M96 79c9-7 19-7 28 1" fill="none" stroke="#3a2925" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M89 91c-1 7-4 12-2 14 2 2 6 2 9 0" fill="none" stroke="#a96852" strokeWidth="2" strokeLinecap="round" />
          <path className="teacher-smile" d="M76 116c8 8 21 8 29 0" fill="none" stroke="#87473f" strokeWidth="3" strokeLinecap="round" />
          <path className="teacher-concern" d="M77 120c8-7 20-7 28 0" fill="none" stroke="#87473f" strokeWidth="3" strokeLinecap="round" />
          <path d="M55 75c-1 9-1 18 0 25M125 75c1 9 1 18 0 25" fill="none" stroke="#bd805e" strokeWidth="1" opacity=".45" />
          <circle cx="53" cy="108" r="4" fill="#e9a18b" opacity=".55" />
          <circle cx="127" cy="108" r="4" fill="#e9a18b" opacity=".55" />
          <path d="M62 140c-8 10-11 22-12 38M118 140c8 10 11 22 12 38" fill="none" stroke="#f3d4b8" strokeWidth="3" opacity=".9" />
        </svg>
        <span className="teacher-label">একটু খেয়াল রাখবেন!</span>
      </div>

      <div className="unboxing-copy">
        <p className="eyebrow">IMPORTANT · PLEASE READ</p>
        <h3 id="unboxing-notice-title">Unboxing video notice</h3>
        <p className="notice-english">
          To help us verify damage, defects or missing items, please start recording <strong>before opening the parcel</strong>.
          Keep one continuous video showing the sealed parcel and shipping label, the full opening process, and the product as first revealed.
          A video started only after unboxing may not be sufficient evidence for a standard defect claim.
        </p>
        <p className="notice-bangla" lang="bn">
          পণ্যের ক্ষতি, ত্রুটি বা কোনো অংশ missing থাকলে যাচাই সহজ করতে <strong>পার্সেল খোলার আগেই ভিডিও রেকর্ডিং শুরু করুন</strong>।
          একটি টানা ভিডিওতে সিল করা পার্সেল ও শিপিং লেবেল, প্যাকেট খোলার সম্পূর্ণ প্রক্রিয়া এবং প্রথমবার পণ্য বের করার পরের অবস্থা স্পষ্টভাবে দেখান।
          আনবক্সিং শেষ হওয়ার পর শুরু করা ভিডিও সাধারণ defect claim যাচাইয়ের জন্য যথেষ্ট নাও হতে পারে।
        </p>
        <p className="notice-legal">
          We review every complaint in line with applicable consumer-protection law. This evidence guideline does not remove your statutory rights.
          <span lang="bn"> প্রতিটি অভিযোগ প্রযোজ্য ভোক্তা-অধিকার আইন মেনে বিবেচনা করা হবে; এই নির্দেশনা আপনার আইনগত অধিকার বাতিল করে না।</span>
        </p>

        {showConsent && (
          <label className="policy-consent">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onCheckedChange?.(event.target.checked)}
            />
            <span>
              I have read and agree to this notice.
              <span lang="bn"> আমি এই নোটিশটি পড়েছি এবং সম্মত।</span>
            </span>
          </label>
        )}
      </div>
    </section>
  );
}
