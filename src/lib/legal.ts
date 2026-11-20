/**
 * Eban's legal texts. The wording comes from the "Eban Terms of Service and Privacy Policy" doc.
 *
 * To publish a change:
 *   1. edit the text below,
 *   2. change TERMS_VERSION and/or PRIVACY_VERSION to today's date,
 *   3. push. Everyone is asked to agree to the new version the next time they open Eban.
 *
 * Fill in LEGAL_DETAILS before going live: anything still in [square brackets] shows on the pages as it is.
 */

export const TERMS_VERSION = "2026-11-20";
export const PRIVACY_VERSION = "2026-11-20";

// Eban isn't registered as a business yet, so it is run by its founder personally.
// When it's registered: put the business name and registered address here and change both versions above.
export const LEGAL_DETAILS = {
  entity: "Princess Nhyira Addai, trading as Eban (business registration in progress)",
  address: "Pamplemousses, Mauritius",
  supportEmail: "support@ebancompany.com",
  privacyEmail: "privacy@ebancompany.com",
};

const fill = (s: string) =>
  s
    .replace(/\{entity\}/g, LEGAL_DETAILS.entity)
    .replace(/\{address\}/g, LEGAL_DETAILS.address)
    .replace(/\{support\}/g, `[${LEGAL_DETAILS.supportEmail}](mailto:${LEGAL_DETAILS.supportEmail})`)
    .replace(/\{privacy\}/g, `[${LEGAL_DETAILS.privacyEmail}](mailto:${LEGAL_DETAILS.privacyEmail})`);

const longDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const TERMS_MD = fill(`*Last updated: ${longDate(TERMS_VERSION)}*

These terms are the agreement between you and **{entity}** ("Eban", "we"), based in {address}. By creating an account or using ebancompany.com you agree to them. If you don't agree, don't use Eban.

### 1. What Eban is

Eban is a marketplace. It connects people who want to send items (**senders**) with people already travelling the same route who have spare luggage space (**travellers**). Eban is not a courier, airline, freight forwarder or customs agent. We don't carry, inspect or take possession of items. The sender and the traveller make the delivery arrangement between themselves; Eban provides the platform, identity checks, messaging and payment holding.

### 2. Your account

- You must be at least 18 and able to enter a binding contract.
- Give true information and keep it up to date. One person, one account.
- Keep your password private. You are responsible for what happens on your account. Tell us at once at {support} if you think someone else has used it.
- Admin accounts must use two-step login.

### 3. Identity checks

Every sender and traveller uploads an ID document and records a short face video. A person at Eban reviews them by hand. We may refuse, pause or remove an account if a check fails or something doesn't add up. An approved check means the documents looked genuine to us at the time; it is not a guarantee of anyone's honesty or behaviour.

### 4. Sending items

As a sender you must:

- describe the item truthfully, including its contents, weight and value;
- pack it securely and leave it open for the traveller to inspect if they ask;
- make sure it is legal to export from the departure country and import into the destination country, and pay any duties or taxes due;
- never send anything on the prohibited list (section 6).

The item details are locked once a traveller accepts. To change them, cancel and create a new request.

### 5. Carrying items

As a traveller you must:

- only accept items you are willing and allowed to carry, and check them before you take them;
- refuse anything that looks prohibited, unsafe or different from its description;
- take a photo of the item when you collect it and again when you deliver it, through the app;
- follow your airline's rules and declare items to customs when required;
- deliver to the recipient and place agreed with the sender, and mark it delivered only when you have.

You are carrying the item in your own name. Customs and airport authorities treat you as responsible for what is in your luggage.

### 6. Prohibited items

Never send or carry:

- cash, cheques, bearer bonds, precious metals or stones;
- weapons, ammunition, explosives, flammable or pressurised items;
- drugs, unprescribed medicine or controlled substances;
- fresh meat, fresh produce or unsealed food;
- counterfeit goods, stolen goods, or anything illegal in either country;
- goods over customs allowances, or anything an airline or customs authority restricts.

Travellers can also list items they won't carry, and can decline any request. Eban may remove listings and accounts linked to prohibited items and report them to the authorities.

### 7. Prices, fees and payment

- Each traveller sets their own price. Eban adds a service fee of **15% of the traveller's price, with a minimum of USD 5**, shown before you pay. We will show any change to the fee before you book.
- The sender pays the full amount to Eban by the methods shown in the app, using the payment reference, and uploads proof of payment. Eban confirms the money arrived before the traveller collects the item.
- Eban holds the payment until delivery is confirmed. The traveller's price is then paid to them; Eban keeps the service fee.
- If the sender doesn't confirm or report a problem within **72 hours** of the traveller marking the item delivered, the payment is released to the traveller automatically.
- Travellers must keep their payout details correct. We are not responsible for payments sent to details you gave us.

### 8. Extra bags

A traveller may offer to buy an extra bag allowance for a request. Eban reviews the price first. If the sender accepts and pays, Eban advances money to the traveller to buy the bag and settles the rest after delivery, as shown in the app.

### 9. Cancellations and refunds

- A sender can cancel at no cost before paying.
- A booking that isn't paid within **48 hours** of being made is cancelled automatically.
- After payment, cancellation goes through Eban. If the traveller hasn't collected the item, we refund the sender in full.
- If a traveller cancels after payment, the sender is refunded in full.

### 10. Problems and disputes

If an item doesn't arrive, arrives damaged, or something else goes wrong, report it in the app before the 72-hour release. The payment then stays held while Eban reviews the messages, photos and receipts on the request. Eban may release the payment to the traveller, refund the sender, or return the request to "delivered". Our decision on where the held payment goes is final within Eban, but it doesn't stop you from taking the matter up with the other person or the courts.

### 11. Behaviour

Be honest and respectful. Don't use Eban to harass anyone, to arrange deals outside the platform to avoid fees, or to share other people's personal details. Keep messages about the delivery. Ratings must be truthful.

### 12. Our responsibility

- Eban doesn't own or carry items and isn't responsible for their loss, damage, delay or seizure, or for anything a sender or traveller does or fails to do. Our responsibility for a request is limited to the payment we hold for it.
- We aim to keep the service running but don't promise it will always be available or error-free.
- Nothing in these terms limits liability that the law doesn't allow us to limit, such as for fraud, or for death or personal injury caused by our negligence.

### 13. Suspending or closing accounts

You can close your account at any time by contacting us. We may pause or close an account that breaks these terms, fails identity checks, or puts others at risk. Requests already paid for are settled first.

### 14. Changes

We may update these terms. We will tell you in the app or by email before important changes take effect, and ask you to agree to the new version.

### 15. Law and disputes

These terms are governed by the laws of Mauritius. Disputes go to the courts of Mauritius, but if you are a consumer you also keep any right to bring a claim in the country where you live.

### 16. Contact

**{entity}**, {address} · {support}
`);

export const PRIVACY_MD = fill(`*Last updated: ${longDate(PRIVACY_VERSION)}*

This policy explains what personal information Eban collects, why, who sees it, how long we keep it, and your rights. **{entity}**, based in {address}, is responsible for your information (the "data controller"). Contact our data protection officer at {privacy}.

Eban is used by people in many countries. Wherever you live, we apply the protections in this policy as a minimum, and you keep any extra rights your own country's data protection law gives you.

### 1. What we collect

| What | Examples | Where it comes from |
| --- | --- | --- |
| Account details | Name, email, phone number, country, whether you send or travel, password (stored scrambled; we can't read it) | You, at sign-up and on your profile |
| Identity checks | Photo of your passport or national ID, ID type, a 12-second face video with a code you read out, our review decision | You |
| Trips and requests | Routes, dates, free luggage space, item type, description, weight and value, handover place and time | You |
| Payments | Amounts, payment reference, your screenshot or receipt of the transfer, refund and payout records | You and our records |
| Payout details | Bank or mobile money account for travellers | You |
| Delivery proof | Photos of the item at collection and delivery, the handover signature | The traveller |
| Messages and reviews | Chat messages on a request, ratings and comments, problem reports, feedback | You and the other person on the request |
| Agreements | Which version of these terms and this policy you agreed to, and when | Our records |
| Notifications | What we told you and when, by app and email | Our records |
| Technical | IP address, device and browser type, sign-in times, error logs | Your device, through our hosting providers |

We don't use advertising or tracking cookies. The app stores your sign-in in your browser's local storage so you stay signed in, and keeps a copy of the app's files so it opens on a bad connection.

### 2. Why we use it

| Purpose | Legal basis |
| --- | --- |
| Running your account and matching senders with travellers | Performing our contract with you |
| Checking identities and preventing fraud, smuggling and misuse | Our legitimate interest in a safe marketplace, and your consent for the face video |
| Holding and releasing payments, refunds and payouts | Performing our contract; keeping financial records is a legal obligation |
| Settling disputes using messages, photos and receipts | Our legitimate interest, and to establish or defend legal claims |
| Sending notifications and account emails | Performing our contract (you can turn off notification emails on your profile) |
| Keeping a record of what our admins change | Our legitimate interest in accountability and security |
| Responding to authorities | Legal obligation, where a valid request is made |

We don't sell your information and don't use it for advertising. We don't make decisions about you by automated means alone: a person reviews every ID and face check.

### 3. Who sees it

- **The other person on your request** sees your first name, rating, verification badge, the request details, messages, and the collection and delivery photos. Payment receipts are seen only by the sender who uploaded them and Eban.
- **Eban admins** see what they need to review identities, confirm payments and settle disputes. Every admin change is recorded in an audit log that can't be edited, and admin accounts require two-step login.
- **Service providers** that run Eban for us, under contracts that limit them to our instructions:
  - Supabase: database, file storage and sign-in (data stored in Ireland, EU)
  - Vercel: hosts the website
  - Resend: sends our emails (Ireland, EU)
  - Our bank and mobile money providers: payments and payouts
- **Authorities** (police, customs, courts, regulators) when the law requires it or to protect someone's safety.

### 4. Information sent abroad

Eban is based in Mauritius and serves people in many countries. Your information is stored in Ireland (EU) and may be handled by our providers in other countries, including the United States. We only use providers that commit to protecting it to the standard of the laws that apply to us, and we use contractual safeguards where the law requires them.

### 5. How long we keep it

| Information | Kept for |
| --- | --- |
| ID images and face videos | 30 days after our review decision; we keep only the result (approved or declined, date, reviewer) |
| Requests, messages, delivery photos, receipts | 2 years after the request is completed or cancelled, in case of disputes |
| Payment and payout records | 7 years, as required for accounting and tax |
| Admin audit log and agreement records | 7 years |
| Notifications | 90 days after you read them |
| Your account | Until you close it, or 3 years without signing in; then deleted or anonymised except where we must keep records |

### 6. How we protect it

Information travels encrypted. ID images, face videos, photos and receipts sit in private storage that only the right people can open, through links that expire. Each person can only reach their own records, enforced by the database itself. Admins use two-step login. If a breach is likely to put you at risk, we will tell you and the regulator without undue delay (in Mauritius, within 72 hours where feasible).

### 7. Your rights

You can ask us to:

- give you a copy of your information;
- correct anything wrong;
- delete your information, where we don't have to keep it;
- restrict or object to how we use it;
- withdraw consent (for example to the face video), which may mean we can't keep your account active.

Email {privacy}. We reply within one month. You can also complain to the data protection regulator in the country where you live. For the countries most of our users come from:

| Where you live | Regulator | Main law |
| --- | --- | --- |
| Mauritius | Data Protection Office | Data Protection Act 2017 |
| Ghana | Data Protection Commission | Data Protection Act 2012 (Act 843) |
| Nigeria | Nigeria Data Protection Commission (NDPC) | Nigeria Data Protection Act 2023 |
| Kenya | Office of the Data Protection Commissioner (ODPC) | Data Protection Act 2019 |
| South Africa | Information Regulator | Protection of Personal Information Act (POPIA) |
| United Kingdom | Information Commissioner's Office (ICO) | UK GDPR and Data Protection Act 2018 |
| EU countries | Your national data protection authority | GDPR |
| Anywhere else | Your national data protection authority, if there is one | Your national law |

### 8. Children

Eban is only for people aged 18 and over. We don't knowingly collect information about children. If you think a child has an account, tell us and we will delete it.

### 9. Changes

If we change this policy in a way that matters, we will tell you in the app or by email before it takes effect, and ask you to agree to the new version.

### 10. Contact

**{entity}**, {address} · {privacy}
`);
