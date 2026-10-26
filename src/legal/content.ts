/**
 * Legal pages. Plain English, written for an Indian SaaS tool used by businesses.
 * Drafted against: Digital Personal Data Protection Act 2023 and DPDP Rules 2025 (notified
 * 14 Nov 2025, phased in by May 2027), IT Act 2000 and the IT (Reasonable Security Practices
 * and Procedures and Sensitive Personal Data or Information) Rules 2011 (which apply until the
 * DPDP Act fully replaces them), Consumer Protection Act 2019, and the policy pages payment
 * gateways such as Razorpay ask for before activating a merchant account.
 * Not legal advice: have a lawyer review before charging customers.
 */

export const LEGAL = {
  name: "ReconOS",
  site: "reconos.in",
  email: "navyajuneja1000@gmail.com",
  officer: "Navya Juneja",
  phone: "+91 85568 17288",
  place: "Gurugram, Haryana, India",
  courts: "Gurugram, Haryana",
  updated: "26 October 2026",
};

export type Block = { p: string } | { ul: string[] };
export interface Section { h: string; blocks: Block[]; id?: string }
export interface LegalDoc { path: string; title: string; intro: string; sections: Section[] }

const E = LEGAL.email;
const GO = `${LEGAL.officer}, Founder, ReconOS (email ${LEGAL.email}, phone ${LEGAL.phone}, ${LEGAL.place})`;

export const PRIVACY: LegalDoc = {
  path: "/privacy",
  title: "Privacy Policy",
  intro: `This policy explains what personal data ${LEGAL.name} collects, why, how it is protected and the rights you have over it. It is written to meet India's Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025, and the Information Technology Act, 2000 and its rules.`,
  sections: [
    {
      h: "The short version",
      blocks: [
        { ul: [
          "The files you check with ReconOS (Shopify, courier, gateway and bank reports, and rate cards) are read inside your own browser. They are never uploaded to us and we never see them.",
          "We only collect what you choose to give us: your details if you join early access, and anything you send us by email.",
          "We use Microsoft Clarity to understand how people use the website, only if you allow it. It never sees your files or results. We do not use advertising trackers or tracking pixels, and we never sell your data.",
          "You can ask us to see, correct or delete your data at any time by writing to " + E + ".",
        ] },
      ],
    },
    {
      h: "1. Who we are",
      blocks: [
        { p: `${LEGAL.name} ("ReconOS", "we", "us", "our") is an online tool, available at ${LEGAL.site}, that helps Indian direct-to-consumer brands find money their couriers and payment gateways owe them. ReconOS is run by ${LEGAL.officer} and is based in ${LEGAL.place}. For the personal data described in this policy, ReconOS is the Data Fiduciary under the Digital Personal Data Protection Act, 2023 ("DPDP Act").` },
        { p: `Contact for anything about your personal data: ${E}.` },
      ],
    },
    {
      h: "2. Files you check with ReconOS",
      blocks: [
        { p: "When you add reports or rate cards to ReconOS, your browser reads and checks them on your own device. The files, and anything in them (including your customers' names, addresses or phone numbers, payment details and bank statement entries), are not sent to our servers or to anyone else. Closing the browser tab clears them." },
        { p: "To save you retyping them each month, the rates you enter, your brand name and the list of partners you picked are kept in your browser's local storage, on your own device. They are never sent to us. You can delete them at any time with \"Forget saved rates\" on the Upload page, or by clearing this website's data in your browser settings." },
        { p: "If you upload a screenshot or photo of a rate card, the text is read on your device using a text recognition program that your browser downloads from our website. The image itself is not sent anywhere." },
        { p: "Because we never receive these files, we do not store, process or share the data in them. You remain responsible for having the right to use the data in your own files, under your agreements with your customers and partners and under the law." },
      ],
    },
    {
      h: "3. Personal data we collect",
      blocks: [
        { ul: [
          "Early access sign-up: your work email address, and if you choose to give them, your store name and your approximate monthly order volume.",
          "Emails you send us: your email address, name if you include it, and what you write.",
          "Basic technical data: when you visit the website, our hosting provider automatically records standard server log information such as your IP address, browser type, the pages requested and the time of the request. When the page loads its fonts, Google's font service receives your IP address in the same way.",
          "Website usage data, only if you allow it: Microsoft Clarity records how you use the website, such as pages viewed, clicks, scrolling, mouse movement, device and browser type, approximate location from your IP address, and a cookie ID. Pages that show your own files and results, and anything you type, are hidden from it.",
          "Payments (only once paid plans open): your billing name, email and the details needed for an invoice. Card, UPI and bank details are entered with our payment gateway and are never stored by us.",
        ] },
        { p: "We do not ask for, and ask you not to send us, sensitive information such as passwords, card numbers, bank account numbers or health information." },
      ],
    },
    {
      h: "4. Why we use it",
      blocks: [
        { p: "We use each type of data only for the purpose it was collected for:" },
        { ul: [
          "Sign-up details: to tell you when monthly audits open for your store and to send you updates about ReconOS that you asked for (based on your consent).",
          "Emails you send: to reply to you and help with your question (based on your consent, given when you write to us).",
          "Technical data: to keep the website running, secure and free from abuse.",
          "Website usage data: to see which parts of the website are confusing or broken, and improve them (based on your consent, given in the cookie banner).",
          "Billing details: to charge for a plan you chose, issue invoices and meet tax and accounting laws (a legitimate use allowed under the DPDP Act, including compliance with law).",
        ] },
        { p: "We do not use your data for advertising, and we do not make automated decisions about you that have legal or similarly significant effects." },
      ],
    },
    {
      h: "5. Your consent",
      blocks: [
        { p: "When you join early access you tick a box agreeing to this policy. You can withdraw your consent at any time, as easily as you gave it, by emailing " + E + " or using the unsubscribe link in any email from us. After you withdraw, we stop using your data for that purpose and delete it within 30 days, unless a law requires us to keep it. Withdrawing does not affect anything we did before." },
      ],
    },
    {
      h: "6. Who we share it with",
      blocks: [
        { p: "We share personal data only with service providers that help us run ReconOS, who act on our instructions and may use it only to provide their service to us:" },
        { ul: [
          "Vercel Inc., which hosts this website.",
          "Google LLC, which provides the website's fonts and our email.",
          "Microsoft Corporation, which provides Microsoft Clarity, only if you allow it. Microsoft may also use this data as described in the Microsoft Privacy Statement.",
          "The form service we use to receive early access sign-ups.",
          "Our payment gateway, once paid plans open, to take payments.",
        ] },
        { p: "We may also disclose personal data if the law requires it, for example to respond to a valid order from a court or government authority. We never sell or rent personal data." },
      ],
    },
    {
      h: "7. Where your data is stored",
      blocks: [
        { p: "Some of our service providers store or process data outside India. We transfer personal data outside India only as permitted by the DPDP Act and will not transfer it to any country the Government of India restricts." },
      ],
    },
    {
      h: "8. How long we keep it",
      blocks: [
        { ul: [
          "Early access details: until you ask us to delete them or withdraw consent, and in any case no longer than 24 months after our last contact with you.",
          "Emails: for as long as needed to deal with your question, and then up to 12 months.",
          "Server logs: for the short period our hosting provider keeps them for security and operations.",
          "Website usage data in Microsoft Clarity: up to 13 months, after which it is deleted.",
          "Billing records: for as long as Indian tax and accounting laws require.",
        ] },
        { p: "When data is no longer needed, we delete it." },
      ],
    },
    {
      h: "9. Your rights",
      blocks: [
        { p: "Under the DPDP Act you have the right to:" },
        { ul: [
          "get a summary of the personal data we hold about you and how we use it, and who we have shared it with;",
          "have inaccurate or incomplete data corrected, completed or updated;",
          "have your data erased when it is no longer needed for the purpose you gave it for, or when you withdraw consent;",
          "withdraw your consent at any time;",
          "have your grievances heard and resolved;",
          "nominate another person to exercise these rights on your behalf if you die or become unable to.",
        ] },
        { p: `To use any of these rights, email ${E} with the subject "Privacy request". We may ask you to confirm your identity first. We will respond within 30 days.` },
      ],
    },
    {
      h: "10. Grievances",
      blocks: [
        { p: `If you have a concern about how we handle your personal data, contact our Grievance Officer: ${GO}. We will acknowledge your complaint within 2 working days and aim to resolve it within 30 days.` },
        { p: "If you are not satisfied with our response, you may complain to the Data Protection Board of India as provided under the DPDP Act." },
      ],
    },
    {
      h: "11. Security",
      blocks: [
        { p: "The website is served over an encrypted connection (HTTPS). We collect as little data as possible, limit who can access it and use reputable providers. No system is completely secure, but if a personal data breach affects you, we will tell you and the Data Protection Board of India as the law requires." },
      ],
    },
    {
      h: "12. Children",
      blocks: [
        { p: "ReconOS is a business tool for people aged 18 and over. We do not knowingly collect personal data from anyone under 18. If you think a child has given us their details, email us and we will delete them." },
      ],
    },
    {
      h: "13. Cookies and tracking",
      id: "cookies",
      blocks: [
        { p: "If you click Allow in the cookie banner, the website loads Microsoft Clarity, which sets cookies (such as _clck and _clsk) to understand how the website is used. If you click No thanks, Clarity is not loaded and no analytics cookies are set. You can change your choice at any time with Cookie settings at the bottom of every page. Clarity is set up so it never records your files, your results or anything you type. We do not use advertising trackers or tracking pixels." },
        { p: "The tool uses your browser's memory while the tab is open, to check your files. It also uses your browser's local storage to remember the rates, brand name and partner list you entered, only so you don't have to retype them. This stays on your device, is never sent to us and is not used to track you. If this ever changes, we will update this policy and ask for your consent where the law requires." },
      ],
    },
    {
      h: "14. Links to other websites",
      blocks: [
        { p: "Our website mentions and links to other companies, such as couriers and payment gateways. Their websites have their own privacy policies, and we are not responsible for them." },
      ],
    },
    {
      h: "15. Changes to this policy",
      blocks: [
        { p: "We may update this policy. The date at the top shows the latest version. If we make a significant change, we will tell people on our early access list by email before it takes effect." },
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  path: "/terms",
  title: "Terms of Use",
  intro: `These terms are an agreement between you and ${LEGAL.name}, run by ${LEGAL.officer}, about your use of the ReconOS website and tool. By using ReconOS you agree to them. If you do not agree, please do not use ReconOS.`,
  sections: [
    {
      h: "1. Who can use ReconOS",
      blocks: [
        { p: "ReconOS is meant for businesses. You must be at least 18 years old and able to enter into a binding contract under Indian law. If you use ReconOS for a business, you confirm you have the authority to accept these terms for it, and \"you\" includes that business." },
      ],
    },
    {
      h: "2. What ReconOS does",
      blocks: [
        { p: "ReconOS reads reports you provide (for example from Shopify, couriers, payment gateways and your bank) and the rates you confirm, compares them, and points out amounts that look missing, short-paid or overcharged. It can also draft emails you may send to your partners and compare how your couriers perform. The free audit is free to use. Paid plans, when available, are described on our Pricing page." },
      ],
    },
    {
      h: "3. Results are estimates, not advice",
      blocks: [
        { ul: [
          "ReconOS is only as accurate as the files and rates you give it. Partners change their report formats, and automatic reading of files and rate cards can make mistakes.",
          "A \"Claim\" means your files suggest money is owed. A \"Check\" means something needs a closer look. Neither is a guarantee that any amount is owed or that a partner will pay it.",
          "Please check every result before you act on it. You decide what to claim, and you are responsible for the claims and messages you send to your partners and for keeping to your agreements with them.",
          "ReconOS does not contact your partners or file claims for you unless we agree to that separately in writing.",
          "ReconOS does not give legal, tax, accounting or financial advice.",
        ] },
      ],
    },
    {
      h: "4. Your files and data",
      blocks: [
        { p: "Files you check are read in your browser and are not sent to us (see our Privacy Policy). You keep all rights to your files and to the results, including the draft emails, which you are free to use. You confirm you have the right to use the data in your files, including your customers' personal data, under your agreements and under the law." },
      ],
    },
    {
      h: "5. Acceptable use",
      blocks: [
        { p: "You agree not to:" },
        { ul: [
          "use ReconOS for anything unlawful, or to make claims you know to be false or misleading;",
          "try to break, overload or get around the security of the website;",
          "copy, resell or reverse engineer ReconOS, except as the law allows;",
          "use automated tools to scrape the website;",
          "use ReconOS in a way that suggests it is made by, or endorsed by, any courier, payment gateway or other company named on it.",
        ] },
      ],
    },
    {
      h: "6. Other companies' names",
      blocks: [
        { p: "Shopify, Razorpay, PayU, Cashfree, PhonePe, Paytm, CCAvenue, Shiprocket, Delhivery, Ekart, Blue Dart, Xpressbees, Shadowfax, DTDC, NimbusPost, iThink Logistics and other names on this website are trademarks of their owners. ReconOS is not affiliated with, endorsed by or sponsored by any of them. Their names are used only to describe which reports ReconOS can read." },
      ],
    },
    {
      h: "7. Sample data",
      blocks: [
        { p: "The sample brand shown on the website (\"Indigo Loom\") and its data are made up to demonstrate the tool. Any resemblance to a real business is coincidental." },
      ],
    },
    {
      h: "8. Paid plans",
      blocks: [
        { p: "Paid plans are not open for payment yet. When they are:" },
        { ul: [
          "prices will be shown on the Pricing page in Indian rupees, with any applicable taxes added at checkout;",
          "monthly plans are billed in advance and renew each month until you cancel;",
          "we will give at least 30 days' notice by email before any price increase affects you;",
          "cancellations and refunds follow our Refund and Cancellation Policy;",
          "any fee based on money you recover applies only if agreed with you in writing.",
        ] },
      ],
    },
    {
      h: "9. Our rights in ReconOS",
      blocks: [
        { p: "ReconOS, including its software, design, text and logo, belongs to us and is protected by law. These terms give you a limited, non-exclusive, non-transferable right to use ReconOS for your own business. If you send us feedback or ideas, we may use them without any obligation to you." },
      ],
    },
    {
      h: "10. Changes and availability",
      blocks: [
        { p: "ReconOS is in early access. We may change, add or remove features, and the website may sometimes be unavailable. We will try to give notice of significant changes that affect paying customers." },
      ],
    },
    {
      h: "11. No warranty",
      blocks: [
        { p: "To the extent the law allows, ReconOS is provided \"as is\" and \"as available\", without any promise that it will be error-free, uninterrupted or that it will find or recover any particular amount." },
      ],
    },
    {
      h: "12. Limit on our liability",
      blocks: [
        { p: "To the extent the law allows, we are not liable for any indirect or consequential loss, lost profits or revenue, lost data, or for claims that partners reject or do not pay. Our total liability to you for anything relating to ReconOS is limited to the amount you paid us in the 3 months before the event giving rise to the claim, or ₹1,000 if you have not paid us anything. Nothing in these terms limits liability that cannot be limited by law." },
      ],
    },
    {
      h: "13. Indemnity",
      blocks: [
        { p: "You agree to compensate us for losses and reasonable costs arising from your breach of these terms, your misuse of ReconOS, or claims and messages you send to third parties using ReconOS." },
      ],
    },
    {
      h: "14. Ending use",
      blocks: [
        { p: "You can stop using ReconOS at any time. We may suspend or end your access if you break these terms or misuse the service. Sections that by their nature should continue (such as 3, 6, 9, 11, 12, 13 and 15) continue after access ends." },
      ],
    },
    {
      h: "15. Governing law and disputes",
      blocks: [
        { p: `These terms are governed by the laws of India. If a dispute arises, please email us first and we will try to resolve it in good faith within 30 days. If it is not resolved, the courts at ${LEGAL.courts} will have exclusive jurisdiction.` },
        { p: "ReconOS is intended for business use. If you are a consumer under the Consumer Protection Act, 2019, nothing in these terms takes away your rights under that law." },
      ],
    },
    {
      h: "16. General",
      blocks: [
        { p: "If any part of these terms is found unenforceable, the rest stays in effect. If we do not enforce a right, we have not given it up. You may not transfer your rights under these terms without our consent. These terms, together with our Privacy Policy and Refund and Cancellation Policy, are the entire agreement between you and us about ReconOS." },
      ],
    },
    {
      h: "17. Changes to these terms",
      blocks: [
        { p: "We may update these terms. The date at the top shows the latest version. If a change is significant, we will tell you by email or on the website before it takes effect. Continuing to use ReconOS after that means you accept the updated terms." },
      ],
    },
    {
      h: "18. Contact and grievances",
      blocks: [
        { p: `Questions or complaints about these terms or the service: Grievance Officer, ${GO}. We acknowledge complaints within 2 working days and aim to resolve them within 30 days.` },
      ],
    },
  ],
};

export const REFUNDS: LegalDoc = {
  path: "/refunds",
  title: "Refund and Cancellation Policy",
  intro: "This policy explains how cancellations and refunds work for ReconOS.",
  sections: [
    {
      h: "1. The free audit",
      blocks: [{ p: "The one-month audit is free. No payment is taken, so there is nothing to refund." }],
    },
    {
      h: "2. Paid plans",
      blocks: [
        { p: "Paid plans are not open for payment yet. When they open, this is how they will work:" },
        { ul: [
          "Plans are billed monthly, in advance.",
          `You can cancel at any time by emailing ${E} from the email address you signed up with, or from your account once accounts are available.`,
          "Cancelling stops future payments. You keep access until the end of the month you have already paid for.",
          "We do not refund part-used months, except in the cases below.",
        ] },
      ],
    },
    {
      h: "3. When we refund",
      blocks: [
        { p: "You will get a refund if:" },
        { ul: [
          "you were charged twice, or charged the wrong amount;",
          "you were charged after you cancelled;",
          "ReconOS was unavailable for more than 7 days in a row in a month you paid for, because of a problem on our side. In that case we refund that month in proportion to the days lost.",
        ] },
        { p: "If a fee based on money you recover has been agreed with you, it is charged only on amounts actually recovered. If a partner takes back an amount within 60 days, we refund the fee charged on it." },
      ],
    },
    {
      h: "4. How to ask for a refund",
      blocks: [
        { p: `Email ${E} with the subject "Refund request", the email address on your account, the date and amount of the payment, and the payment reference. We will reply within 2 working days and decide within 7 working days. Approved refunds are sent to the original payment method and usually reach you within 5 to 7 working days, depending on your bank.` },
        { p: "If something is wrong with a charge, please contact us before raising a dispute with your bank, so we can fix it quickly." },
      ],
    },
  ],
};

export const SHIPPING: LegalDoc = {
  path: "/shipping",
  title: "Delivery Policy",
  intro: "ReconOS is an online software service. Nothing is shipped.",
  sections: [
    {
      h: "How the service is delivered",
      blocks: [
        { ul: [
          "The free audit is available immediately on this website. There is nothing to install.",
          "When paid plans open, access starts as soon as your payment is confirmed. We will email you a confirmation and, where relevant, an invoice.",
          "There are no physical goods, shipping charges or delivery times.",
          `If you have paid and cannot access the service, email ${E} and we will sort it out within 1 working day.`,
        ] },
      ],
    },
  ],
};

export const CONTACT: LegalDoc = {
  path: "/contact",
  title: "Contact us",
  intro: "We would love to hear from you, whether it is a question, feedback or a problem.",
  sections: [
    {
      h: "Get in touch",
      blocks: [
        { ul: [
          `Website: ${LEGAL.site}`,
          `Email: ${E}`,
          `Phone: ${LEGAL.phone}`,
          `Based in: ${LEGAL.place}`,
          "Hours: Monday to Saturday, 10 am to 6 pm IST. We usually reply within 1 working day.",
        ] },
      ],
    },
    {
      h: "Privacy and grievances",
      blocks: [
        { p: `Grievance Officer: ${GO}. Contact them for privacy requests (to see, correct or delete your data) or complaints. We acknowledge within 2 working days and aim to resolve within 30 days.` },
      ],
    },
    {
      h: "Help us help you",
      blocks: [
        { p: "If you are writing about a result, tell us which partner and report it is about. Please do not email us your full reports or any customer data. Describe the problem, or send a few rows with personal details removed." },
      ],
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [PRIVACY, TERMS, REFUNDS, SHIPPING, CONTACT];
export const LEGAL_BY_PATH: Record<string, LegalDoc> = Object.fromEntries(LEGAL_DOCS.map((d) => [d.path, d]));
