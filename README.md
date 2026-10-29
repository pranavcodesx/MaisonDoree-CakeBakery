# Maison Dorée — MERN bakery (website + admin panel)

```
cake-bakery/
├── server/   Node.js + Express + MongoDB API   → http://localhost:5000
├── client/   React + Vite + Tailwind website   → http://localhost:5173   (customers)
└── admin/    React + Vite + Tailwind admin     → http://localhost:5174   (shop owner)
```

All three share **one MongoDB database**. Whatever the owner changes in the admin panel shows on the website straight away.

---

## ⚡ झटपट सुरुवात (Quick start, in Marathi)

1. **MongoDB चालू करा** – (A) कॉम्प्युटरवर MongoDB install करा, किंवा (B) MongoDB Atlas वर free cluster बनवा. खाली "Step 1" बघा.
2. `server` फोल्डरमध्ये: `.env.example` ची कॉपी `.env` नावाने बनवा → `MONGO_URI` आणि `JWT_SECRET` भरा.
3. तीन टर्मिनल उघडा:
   - **server:** `npm install` → `npm run seed` → `npm run create-admin -- "तुमचे नाव" you@email.com "Password123"` → `npm run dev`
   - **client:** `npm install` → `npm run dev` (website: http://localhost:5173)
   - **admin:** `npm install` → `npm run dev` (admin: http://localhost:5174)
4. Admin मध्ये वरचा email/password वापरून login करा.

पूर्ण स्टेप्स खाली English मध्ये आहेत.

---

## What you need

| Tool | Version | Check |
|---|---|---|
| Node.js | **20 or newer** (20 LTS recommended) | `node -v` |
| MongoDB | local install **or** a free Atlas cluster | see Step 1 |
| Git (optional) | any | |

---

## Step 1 — Get a MongoDB database (choose A or B)

### A) MongoDB on your own computer

**Windows**
1. Download *MongoDB Community Server* from <https://www.mongodb.com/try/download/community> and run the installer.
2. Choose **Complete**, keep **"Install MongoDB as a Service"** ticked, and (optionally) install *MongoDB Compass*, a window where you can look at your data.
3. MongoDB now starts with Windows. Nothing else to do.

**macOS** (with Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu / Linux** — follow the official guide for your version: <https://www.mongodb.com/docs/manual/administration/install-on-linux/>, then `sudo systemctl start mongod`.

**Check that it works** (optional): run `mongosh` — you should see a prompt like `test>`. Type `exit`.

Your connection string is:
```
mongodb://127.0.0.1:27017/maison_doree
```
(`maison_doree` is the database name. MongoDB creates it automatically the first time you save data.)

### B) MongoDB Atlas (free, in the cloud — also what you will use when the site goes live)
1. Sign up at <https://www.mongodb.com/atlas> and create a **free (M0) cluster**.
2. **Database Access → Add New Database User.** Pick a username and a password (use letters and numbers only, to avoid trouble).
3. **Network Access → Add IP Address.** For learning, choose *Allow access from anywhere* (`0.0.0.0/0`). For a live site, add only your server's IP.
4. **Database → Connect → Drivers.** Copy the string. It looks like:
   ```
   mongodb+srv://myuser:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your real password and add the database name before the `?`:
   ```
   mongodb+srv://myuser:MyPass123@cluster0.abcde.mongodb.net/maison_doree?retryWrites=true&w=majority
   ```
   (If your password has symbols like `@ : / #`, URL-encode them, e.g. `@` → `%40`.)

---

## Step 2 — Server (API)

```bash
cd server
cp .env.example .env        # on Windows: copy .env.example .env
```
Open `.env` and set:

| Setting | What to put |
|---|---|
| `MONGO_URI` | the connection string from Step 1 |
| `JWT_SECRET` | any long random text. Make one with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | optional. Turns on "Continue with Google" (steps below in *Google sign-in*) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | for **Forgot password** emails (steps below in *Forgot password*). Leave empty on your computer: the reset link is printed in the server window |
| `PUBLIC_URL` | only when live: your website address, used inside the reset email (e.g. `https://maison-doree.onrender.com`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | optional. Leave empty and customers can pay by **Cash on Delivery** only |
| `CLOUDINARY_*` (3 values) | optional on your computer (photos are saved in `server/uploads/`). **Required on free hosting**, where the disk is wiped. See DEPLOY.md |

Then:
```bash
npm install
npm run seed                # adds 47 sample cakes, 17 categories, coupons and delivery pincodes
npm run create-admin -- "Your Name" you@yourbakery.com "A-Strong-Password"
npm run dev                 # API on http://localhost:5000
```
**Quick local login:** run `npm run create-admin` with **no values** and it creates the testing admin **`admin@gmail.com` / `Admin123`** (it refuses to do this when `NODE_ENV=production`). Fine on your own computer; **never keep this password on a live website.**
You should see `API running on http://localhost:5000`. Visit <http://localhost:5000/api/health> — it should answer `{"ok":true}`.

* `npm run seed` is safe to run again: it only adds what is missing.
* `npm run create-admin` can be run again with the same email to **reset that admin's password**.
* The login screen has no "Register" tab on purpose. There is deliberately **no public "create admin" page** — nobody can make themselves an admin from the browser.

## Step 3 — Website (customers)

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

## Step 4 — Admin panel (you)

```bash
cd admin
npm install
npm run dev                 # http://localhost:5174
```
Log in with the email and password from `create-admin`.

> Keep the **server** running in one terminal and run the website / admin in others. If you see "Failed to fetch" or empty pages, the server is not running.

---

## First 10 minutes in the admin panel

1. **Settings** → shop name, phone, email, address, opening hours, tax rate, custom-cake prices.
2. **Delivery** → same-day cut-off time, time slots, COD limit, and **the pincodes you deliver to** (the seed adds some Kolhapur pincodes as a starting point; edit or add yours).
3. **Cakes** → edit the sample cakes or add your own. Upload **2–3 photos** per cake (first photo = cover; the rest appear in the cake's popup gallery). With no photo the website shows a stock picture.
4. **Categories**, **Coupons** → rename, hide or add.
5. **Website content** → founder name, team members (with photos) and FAQs. The "Meet the team" section stays hidden until you add someone.
6. Place a test order on the website, then watch it arrive in **Orders** (a bell/toast tells you about new orders within ~20 seconds). Change its status and the customer's *Track order* page updates.

---

## How the admin panel and the website are connected

| In the admin panel you change… | …and the website changes |
|---|---|
| **Cakes**: photos (1–5), price, tags, occasions, flavor, size, archive | product cards, the popup gallery, home-page tabs (Best sellers / New / Trending / Seasonal), filters, search |
| **Categories** | category chips on the home page and shop |
| **Coupons** | "Offers & coupons" on the home page, and what works in the cart. A code that starts with `SPIN` (e.g. `SPIN15`) becomes a prize on the **Spin & Win** wheel while it is switched On |
| **Delivery** → pincodes, charges, slots, cut-off, COD limit | pincode check, delivery charge, date/time choices at checkout |
| **Settings** → tax, **reward points**, custom-cake prices, shop details | order totals, points earned and spent at checkout, member tiers, the "Build your cake" prices, Contact page, About numbers |
| **Website content** | The home-page banner photos, the **occasions** list, **candle and knife choices**, the whole About page (story and photos, chefs with photo + specialty, "why choose us" cards, kitchen gallery), founder, and the Contact page FAQs (write `{{cutoff}}` in an answer to show your real same-day cut-off time) |
| **Orders** → status | customer's Track page and account (the 7-step tracker) **and an email to the customer** (confirmed, baking, out for delivery, delivered, cancelled). The order screen also has a **WhatsApp** link with the message already written |
| **Reviews** → hide / show | star ratings and reviews on cakes and the home page |
| Customers' **Contact form** and **newsletter** box | **Inbox** in admin. The **Send offers** tab there emails an offer or new-arrival message to the customers who chose to receive it |

**Cake sizes.** A cake whose size is 1, 1.5, 2 or 3 kg can be bought in several weights (500 g to 3 kg, price scales automatically). Any other size (a 300 g cupcake box, a 900 g cheesecake) is sold as **one fixed pack** at its own price, and the order shows its real size.

**Emails need SMTP.** Order emails, the *Send offers* tab and *Forgot password* all use the SMTP settings in the **Forgot password** section below. Without SMTP they are printed in the server window while you test, and nothing is sent. Customers can switch *Order updates* off in their account (the order confirmation always goes out, like a receipt). Automatic WhatsApp messages need the paid WhatsApp Business API, so for now use the **WhatsApp** link on the order screen.

**Reward points.** Customers earn points when an order is delivered and spend them as a discount at checkout (*Use … reward points*). You choose the rules in **Settings → Reward points**: points per ₹100, what one point is worth, the minimum to use, the most of an order points may pay, and the Silver/Gold levels. A cancelled order gives its points (and its spin prize) back.

**What a customer picks on a cake** — message on cake, candle, knife, reference photo (or the whole Custom Cake Builder design: shape, tiers, cream, topper, colour) — is saved on the order and shown in the admin order screen, the CSV export and the customer's invoice.

---

## Google sign-in ("Continue with Google") — optional, free

The login box of the website can show Google's official button. It is **off until you add a Client ID**.

1. Go to <https://console.cloud.google.com> and sign in with your Google account. Create a project (top bar → *New project* → name it *Maison Dorée*).
2. Left menu → **APIs & Services → OAuth consent screen** (also called *Google Auth Platform*). Choose **External**, fill the app name (*Maison Dorée*), your support email and developer email, then save. Keep it in *Testing* while you try it (only the Gmail addresses you list as *Test users* can sign in), and press **Publish app** when you are ready for everyone. Basic sign-in (name, email, photo) needs no Google review.
3. **Credentials → Create credentials → OAuth client ID →** type **Web application**.
4. **Authorized JavaScript origins** → add the addresses your website runs on, with no slash at the end:
   - `http://localhost:5173` (for testing on your computer)
   - `http://localhost:5000` (if you run the "one server" mode)
   - `https://your-shop.onrender.com` (your live address, later)
   You do **not** need a "redirect URI".
5. Press **Create** and copy the **Client ID** (it ends with `.apps.googleusercontent.com`). Do not share the *client secret*; you don't need it.
6. Put it in `server/.env`:
   ```
   GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
   ```
   Restart the server. The login box now shows **Continue with Google**.

How it works: Google gives the browser a signed token; **your server checks the signature, that the token was made for *your* Client ID, that it has not expired, and that the email is verified**, then logs the customer in. If the email already has an account, the two are joined. Shop-owner (admin) accounts can never use Google sign-in. Customers who sign up with Google can add a password later in *Account → Settings*.

## Forgot password

The login box has a **Forgot password?** link. The customer enters their email, the server emails a link, and the link opens `/reset-password` where they choose a new password. The link works for **30 minutes** and **only once**. After a reset, any older logged-in sessions of that account are logged out. Admin accounts cannot be reset from the website: run `npm run create-admin` again with the same email.

**Testing on your computer (no setup):** leave the `SMTP_*` settings empty. Click *Forgot password?*, then look at the window where the server is running: the email, with the reset link, is printed there.

**Sending real emails (needed once the site is live):**
1. Use any SMTP service. The easiest free one is a Gmail account: turn on *2-Step Verification* in your Google account, then open *Security → App passwords* and create one named *Maison Dorée* (16 letters).
2. In `server/.env` (or the Render dashboard) set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourbakery@gmail.com
   SMTP_PASS=the-16-letter-app-password
   MAIL_FROM="Maison Dorée <yourbakery@gmail.com>"
   PUBLIC_URL=https://your-website-address
   ```
3. Restart the server. Brevo, Resend or Zoho Mail work the same way with their own SMTP details.

Customers who signed up only with a phone number have no email, so they cannot use this; they can add an email in *Account → Settings* first.

## Online payments (Razorpay) — optional
1. Create an account at <https://razorpay.com> and copy your **Test** Key Id and Key Secret.
2. Put them in `server/.env`, restart the server.
3. At checkout, customers now see *Pay online*. Payments are verified on the server before an order counts.
4. If an already-paid order is cancelled, the admin panel flags **"Refund due"**. Refund it in the Razorpay dashboard, then press *Mark refunded*.

## Going live with real payments (later)

For your project, **Test** keys are enough and nothing below is needed. When you want real money:

1. **Get live keys.** In Razorpay, finish *KYC / account activation*, then copy the **Live** Key Id and Key Secret into `server/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and into your hosting dashboard. Restart the server. Test keys start with `rzp_test_`, live keys with `rzp_live_`.
2. **Turn on the webhook.** Right now the website learns about a payment only from the customer's browser. If the customer closes the tab right after paying, the money is taken but the order stays hidden. The webhook lets Razorpay tell our server directly. The code is already written, only switched off:
   1. Open `server/src/routes/razorpayWebhook.js` and delete the `/*` line near the top of the code and the `*/` line at the very end.
   2. Open `server/src/index.js`. Un-comment the 2 lines under `// WEBHOOK`: move the `import` line up with the other imports, and keep the `app.use('/api/razorpay-webhook', ...)` line **above** `app.use(express.json(...))`.
   3. In the Razorpay dashboard go to *Settings → Webhooks → Add new webhook*. URL: `https://YOUR-WEBSITE/api/razorpay-webhook`. Type any long random text as the **Secret**. Tick the events **payment.captured** and **order.paid**. Save.
   4. Put the same secret in `server/.env` as `RAZORPAY_WEBHOOK_SECRET=...` (and in your hosting dashboard). Restart the server.
   5. Test it once in Test mode with Razorpay's *Send test webhook* button, or pay and close the tab straight away: the order should still appear.
3. **Refunds are manual.** When a paid order is cancelled the admin panel shows *Refund due*. Refund it in the Razorpay dashboard, then press *Mark refunded*. (Automatic refunds through the Razorpay API are possible later.)
4. **Check the legal side.** Put your business name, address, refund / cancellation policy and a privacy policy on the website. Razorpay checks for them. Ask your accountant how GST should be charged: today tax is calculated on the order subtotal *before* coupon and reward-point discounts, and delivery is not taxed.
5. **Use HTTPS and production settings.** Set `NODE_ENV=production`, a long random `JWT_SECRET`, `CLIENT_ORIGINS` and `PUBLIC_URL` to your real website address, and SMTP for emails.

## Where are the uploaded photos?
On your computer: in `server/uploads/` (**back it up**). When the three `CLOUDINARY_*` settings are filled in, every upload (cake photos, gallery, chefs, customers' reference photos) goes to Cloudinary instead, and the database stores the web address. Use Cloudinary for any live site.

---

## Putting it live (free)
See **[DEPLOY.md](DEPLOY.md)** — a step-by-step guide to run the whole shop on free plans: one Render server (website at `/`, admin at `/admin`), MongoDB Atlas for the data and Cloudinary for photos.

To try the "one server" setup on your own computer first:
```bash
npm run render-build        # installs everything and builds the website + admin (from the cake-bakery folder)
cd server && npm start      # website: http://localhost:5000   admin: http://localhost:5000/admin
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. Start it (Windows: *Services → MongoDB*; Mac: `brew services start mongodb-community`; Linux: `sudo systemctl start mongod`). |
| `bad auth` / `Authentication failed` (Atlas) | Wrong user or password in `MONGO_URI`, or the password has symbols that need URL-encoding. |
| Atlas times out | Add your IP under *Network Access*. |
| `JWT_SECRET missing or too short` | Set a long `JWT_SECRET` in `server/.env` (16+ characters). |
| `EADDRINUSE :5000` | Something else uses the port. Change `PORT` in `server/.env` **and** the proxy target in `client/vite.config.js` and `admin/vite.config.js`. |
| Website is empty / "Failed to fetch" | The server isn't running, or `npm run seed` hasn't been run. |
| Admin login says "Incorrect email or password" | Run `npm run create-admin -- "Name" email "password"` again. |
| "Online payment is not available" at checkout | Razorpay keys are not set in `server/.env`. |
| Photos don't show | Make sure the server is running; photos are served from `/uploads`. |

## Automated API tests (optional, for developers)
About 300 checks cover login, forgot/reset password, catalog, fixed-size cakes, checkout, reward points, spin & win, orders, payments, the admin panel, settings and CSV exports.
```bash
cd server
npm run test:api
```
It needs only a running MongoDB. It starts its own server on port 5099 and uses a **separate throwaway database**
(`maison_doree_test` by default; set `TEST_MONGO_URI` to change it). It refuses to run on any database whose name
does not end in `_test`, so your real data is never touched.
