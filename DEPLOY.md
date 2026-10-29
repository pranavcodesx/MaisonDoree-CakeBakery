# Putting Maison Dorée live — completely free

**मराठीत थोडक्यात:** तुमची साइट एकाच free server वर चालते (Render): त्यावरच website `/` आणि admin `/admin` असतात. Database = MongoDB Atlas (free), फोटो = Cloudinary (free). सगळे स्टेप्स खाली आहेत. Free plan वर साइट १५ मिनिटे वापरात नसेल तर झोपते, पहिल्या visitor ला उघडायला सुमारे १ मिनिट लागू शकतो (खाली "Keep it awake" बघा).

```
        customers ──►  https://your-shop.onrender.com        (website)
        you       ──►  https://your-shop.onrender.com/admin  (admin panel)
                              │  one Node.js server (Render, free)
                  ┌───────────┴────────────┐
           MongoDB Atlas (free)      Cloudinary (free)
           orders, cakes, users      cake photos, gallery, customers' reference photos
```
Because the website, admin and API share one address, there are no CORS or cookie problems.

## What is free, and the catch (checked October 2026 — plans change, so glance at each site's pricing page)

| Service | Free plan gives you | The catch |
|---|---|---|
| **Render** (web server) | 1 free web service, ~750 instance-hours a month (enough for one service running all month), free `onrender.com` address with HTTPS, auto-deploy from GitHub | Sleeps after **15 minutes without visitors**; the next visitor waits roughly a minute while it wakes. **Its disk is wiped on every restart/deploy**, which is why photos must live on Cloudinary. No shell on the free plan. |
| **MongoDB Atlas** (database) | M0 cluster, **512 MB** storage, never expires | **No automatic backups** on the free tier. It can pause after about a month with no connections (one click to resume; a live shop won't hit this). |
| **Cloudinary** (photos) | Free plan with **25 credits a month** (1 credit ≈ 1 GB of storage or 1 GB of bandwidth) | Plenty for a small bakery. If you ever exceed it, uploads/delivery pause rather than bill you. |
| **Razorpay** (online payments) | No monthly fee | A per-payment fee (see their pricing page). Going live needs KYC. You can skip it and take Cash on Delivery only. |
| **Domain name** (optional) | — | `yourbakery.in` costs roughly ₹700–1,000 a year. The free `onrender.com` address works fine to start. |

**Honest advice:** the free setup is perfect for launching and for the first customers. When orders become regular, upgrade the Render service to the paid plan (it removes sleeping; about US$7/month — see render.com/pricing). Nothing else in this guide changes.

---

## Step 0 — Check it works on your computer first
Follow the README (MongoDB + `npm run dev` in `server`, `client`, `admin`), place a test order, change something in admin. Fix surprises here, not on the live site.

## Step 1 — Put the code on GitHub
Render deploys from a GitHub repository.
1. Make a free account at <https://github.com>, install **Git** (<https://git-scm.com/downloads>), and create an **empty private repository** named e.g. `maison-doree`.
2. In the `cake-bakery` folder (the one containing `server`, `client`, `admin`, `render.yaml`):
   ```bash
   git init
   git add .
   git commit -m "Maison Dorée"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/maison-doree.git
   git push -u origin main
   ```
3. Check on github.com that **`.env` is NOT in the repository** (the included `.gitignore` already protects it). Secrets must never be committed.

## Step 2 — Database: MongoDB Atlas
1. <https://www.mongodb.com/atlas> → create a free account → create a **free M0** cluster (choose a region close to India, e.g. Mumbai if offered).
2. **Database Access → Add user:** username + a strong password (letters and numbers only keeps it simple). Role: *Read and write to any database*.
3. **Network Access → Add IP address → Allow access from anywhere (`0.0.0.0/0`).** Render's free plan has no fixed IP, so this is required. Your password protects the database.
4. **Connect → Drivers** → copy the string and add the database name:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/maison_doree?retryWrites=true&w=majority
   ```
   Keep it for Step 4. (Symbols in the password must be URL-encoded, e.g. `@` → `%40`.)

## Step 3 — Photos: Cloudinary
1. <https://cloudinary.com> → sign up free.
2. Open the **Dashboard**: copy the **Cloud name**, **API Key** and **API Secret**.
That's all. The server uploads photos to a folder called `maison-doree` and stores their web addresses.

## Step 4 — Create the shop's data and your admin login (once)
Render's free plan has no terminal, so do this **from your own computer, pointed at the live database**:

*Windows (PowerShell):*
```powershell
cd server
npm install
$env:MONGO_URI="PASTE-YOUR-ATLAS-STRING-HERE"
npm run seed
npm run create-admin -- "Your Name" you@yourbakery.com "A-Long-Strong-Password"
```
*Mac / Linux:*
```bash
cd server && npm install
MONGO_URI="PASTE-YOUR-ATLAS-STRING-HERE" npm run seed
MONGO_URI="PASTE-YOUR-ATLAS-STRING-HERE" npm run create-admin -- "Your Name" you@yourbakery.com "A-Long-Strong-Password"
```
(In production mode `create-admin` refuses to use the default test login, so you always choose your own.) `seed` loads 47 sample cakes, 17 categories, coupons and delivery pincodes. You will edit or archive these in the admin panel. (If you'd rather start with an empty menu, archive them all after logging in.)

## Step 5 — Create the web service on Render
1. <https://render.com> → sign up with GitHub.
2. **New + → Blueprint** → pick your repository. Render reads `render.yaml` and prepares one **free** web service called `maison-doree`.
   *(Prefer clicking through manually? New + → Web Service → your repo, **Runtime** Node, **Build Command** `npm run render-build`, **Start Command** `npm start`, **Instance type** Free, **Health Check Path** `/api/health`.)*
3. Fill the environment variables it asks for:

| Variable | Value |
|---|---|
| `MONGO_URI` | your Atlas string (Step 2) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Step 3 |
| `GOOGLE_CLIENT_ID` | optional. Turns on "Continue with Google" (see Step 8b) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | leave empty for now (Cash on Delivery only) |
| `JWT_SECRET` | created for you automatically (if you set it yourself: 32+ random characters) |
| `NODE_ENV` = `production`, `NODE_VERSION` = `20` | already in `render.yaml` |

4. Click **Apply / Create**. The first build takes a few minutes (it installs everything and builds the website and the admin panel). Watch the **Logs**; success ends with `API running on http://localhost:10000` (Render picks the port itself) and the service shows **Live**.

## Step 6 — Check the live site
Open your address (e.g. `https://maison-doree.onrender.com`; the first load may take a minute):
- [ ] `/api/health` shows `{"ok":true}`
- [ ] The website shows cakes
- [ ] `/admin` shows the login; log in with the account from Step 4
- [ ] In admin → **Settings**, **Delivery** and **Website content**, fill in your real details
- [ ] In admin → **Cakes**, upload a photo to one cake. Open Cloudinary → *Media Library* → folder `maison-doree`: the photo is there, and it still shows after you redeploy
- [ ] Place a Cash-on-Delivery test order on the website and watch it arrive in admin → **Orders**

## Step 7 — Keep it awake (optional, free)
Render's free service sleeps after 15 idle minutes. A free uptime monitor that opens your site every 5 minutes keeps it awake:
1. <https://uptimerobot.com> (free plan) → *Add New Monitor* → type **HTTP(s)**, URL `https://YOUR-SITE.onrender.com/api/health`, interval **5 minutes**.
One always-on service fits inside the 750 free hours. If Render ever changes its free-plan rules, simply upgrade to a paid instance.

## Step 8 — Take online payments (when you're ready)
1. Create a Razorpay account and finish **KYC** (needed for Live mode).
2. Razorpay → Settings → API Keys → generate **Live** keys.
3. In Render → your service → **Environment**, set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, save (the service restarts).
4. Test with a small real payment. Refunds: do them in the Razorpay dashboard, then press *Mark refunded* in admin → Orders/Payments.
Until you do this, customers simply see Cash on Delivery.

## Step 8b — "Continue with Google" for customers (optional, free)
Follow *Google sign-in* in `README.md` to get a **Client ID**, and in step 4 there add your live address as an **Authorized JavaScript origin**, e.g. `https://maison-doree.onrender.com` (and later your own domain). Then in Render → **Environment** add `GOOGLE_CLIENT_ID` and save. In Google's *OAuth consent screen* press **Publish app** so that every customer (not only test users) can sign in.

## Step 9 — Your own domain (optional, not free)
Buy a domain (GoDaddy, Namecheap, Hostinger…). In Render → your service → **Settings → Custom Domains → Add**, then create the DNS record Render shows (a CNAME for `www`, and the A/ALIAS record it lists for the bare domain). Render issues the HTTPS certificate for free. Nothing in the code changes.

---

## Updating the live site
Change code → `git add . && git commit -m "…" && git push`. Render rebuilds and deploys by itself. Your orders, cakes and photos are not touched (they live in Atlas and Cloudinary). Everything you edit in the admin panel is live immediately, with no deploy.

## Backups (do this — the free database has none)
- Orders, customers and cakes: from admin → **Reports**, download the CSVs every week or two.
- Full copy of the database: install *MongoDB Database Tools* (<https://www.mongodb.com/try/download/database-tools>) and run
  ```bash
  mongodump --uri="YOUR-ATLAS-STRING" --out=backup-2026-10-17
  ```
  Restore with `mongorestore --uri="…" backup-2026-10-17`.
- Photos live in Cloudinary (their Media Library can be downloaded too).

## Before you tell customers
- [ ] **Your admin login is NOT `admin@gmail.com` / `Admin123`.** That pair is only for testing on your own computer; anyone can guess it. Create your own with `npm run create-admin -- "Name" you@yourbakery.com "A-long-private-password"` (Step 4) and change it later in admin → Settings
- [ ] Shop details, delivery areas, time slots and tax are real (admin → Settings / Delivery)
- [ ] Sample cakes, prices and the demo coupons are edited, archived or deleted
- [ ] About page texts, chefs and gallery are yours (admin → Website content)
- [ ] You placed a test order and tested cancellation
- [ ] Your **FSSAI licence number** and GST details are shown wherever the law requires (ask your accountant or the FSSAI site what applies to you; this guide is not legal advice)
- [ ] Contact page phone and email work

## Troubleshooting
| Problem | Fix |
|---|---|
| Build fails with a Node version error | In Render → Environment set `NODE_VERSION` = `20`. |
| Log says `JWT_SECRET must be a random string of at least 32 characters` | Set `JWT_SECRET` to a long random value (or delete it and let the Blueprint generate one). |
| Log shows MongoDB connection errors | Atlas → Network Access must allow `0.0.0.0/0`; check the username/password in `MONGO_URI` and URL-encode symbols. |
| Site shows a blank page or `Cannot GET /` | The website was not built. Make sure the Build Command is `npm run render-build`. |
| First visit is very slow | The free service was asleep (Step 7), or upgrade the instance. |
| Photos vanish after a deploy | Cloudinary variables are missing, so photos went to Render's disk. Add them, then re-upload the photos. |
| "The photo could not be saved" | Wrong Cloudinary key/secret, or the monthly Cloudinary quota is used up. |
| Admin login keeps failing | Re-run `create-admin` (Step 4) with the live `MONGO_URI`. |
| Online payment not offered | Razorpay keys are not set (Step 8). |
| You see the *Service Unavailable / Application failed to respond* page | Open **Logs** in Render; the last lines say what failed. |

## If you host the website and admin on different addresses instead
Not needed for this guide. If you do (for example static hosting for `client`/`admin`), build each with `VITE_API_URL=https://your-api` and on the server set `CLIENT_ORIGINS` to both addresses and `COOKIE_SAMESITE=none`. Same-domain hosting (this guide) is simpler and more reliable because browsers block cross-site cookies more and more.
