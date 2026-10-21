# CareerKit – Resume Builder & Student Help

Node.js + Express + MongoDB (Atlas) + vanilla JS frontend.

Features: sign up / login (JWT, bcrypt), save / open / delete resumes, live resume preview, PDF download,
ATS keyword checker, cover letter generator, interview question bank, career roadmaps.

## Run locally
1. Install Node.js 18+ from nodejs.org
2. `npm install`
3. Copy `.env.example` to `.env` and fill in MONGO_URI and JWT_SECRET
4. `npm start` then open http://localhost:3000

## Deploy (free): MongoDB Atlas + Render
### A. Database (MongoDB Atlas)
1. Sign up at mongodb.com/atlas, create a free **M0** cluster.
2. Database Access > Add New Database User > set a username and password (avoid @ : / in the password).
3. Network Access > Add IP Address > **Allow access from anywhere (0.0.0.0/0)**.
4. Database > Connect > Drivers > copy the connection string. Replace `<password>` and add the db name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/careerkit?retryWrites=true&w=majority`

### B. GitHub
1. Create a new empty repo on github.com.
2. In this folder run:
   git init
   git add .
   git commit -m "CareerKit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/careerkit.git
   git push -u origin main
   (`.env` is git-ignored, so your secrets are not uploaded.)

### C. Render
1. Sign up at render.com with GitHub. New + > **Web Service** > pick your repo.
2. Runtime: Node. Build command: `npm install`. Start command: `npm start`. Instance type: Free.
3. Environment Variables: add `MONGO_URI` (your Atlas string) and `JWT_SECRET` (any long random text).
4. Create Web Service. After 2-3 minutes you get a link like https://careerkit.onrender.com
5. Test: open the link > Account > Sign up > build a resume > Save > refresh > My Resumes.

Note: Render free apps sleep after ~15 min idle, so the first load can take ~50 seconds. Open the link
before your demo to wake it up.

## API
POST /api/register, POST /api/login, GET /api/me,
GET/POST /api/resumes, GET/PUT/DELETE /api/resumes/:id (all resume routes need a Bearer token).
