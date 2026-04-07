# ⚡ Splash Electronics

An AI-powered **E-commerce web application** built using the **MERN Stack (MongoDB, Express, React, Node.js)** that sells electronics products such as **phones, laptops, SSDs, HDDs, TVs, tablets, and accessories**.  
It features **multiple payment gateways**, **AI-based product recommendations**, and **real-time order tracking**.

---

## 🚀 Features

### 🛍️ Customer Features
- Browse and search products by category (Phones, Laptops, Accessories, etc.)
- AI-driven personalized product recommendations
- Real-time order tracking (via Socket.io)
- Secure checkout with multiple payment gateways (bKash, Nagad, DBBL)
- User authentication (JWT-based login/register)
- Wishlist and Cart management
- Order history and invoice download

### 🧑‍💼 Admin Features
- Advanced Admin Dashboard
- Add, update, or delete products
- View and manage users and orders
- Real-time sales analytics
- Order status control with live updates
- Manage payments and refunds

---


---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React.js, Redux Toolkit, Axios, TailwindCSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ORM) |
| **Real-Time** | Socket.io |
| **AI Engine** | TensorFlow.js / Python API |
| **Payment Integration** | bKash, Nagad, DBBL API |
| **Deployment** | Vercel (frontend), Render/Heroku (backend), MongoDB Atlas |

---

## Deployment

### Frontend on Vercel
- Import the repo into Vercel.
- Set the project root directory to `frontend`.
- Build command: `npm run build`
- Output directory: `build`
- Environment variable: `REACT_APP_API_URL=https://your-render-service.onrender.com/api`

The included [`frontend/vercel.json`](/d:/Splash-Electronics/frontend/vercel.json) rewrites all routes to `index.html` so React Router works on refresh.

### Backend on Render
- Create a new Web Service from this repo, or use the included [`render.yaml`](/d:/Splash-Electronics/render.yaml).
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Set these Render environment variables:
- `MONGO_URI`
- `FRONTEND_URL=https://your-vercel-domain.vercel.app`
- `CORS_ORIGINS=https://your-vercel-domain.vercel.app`
- `BACKEND_URL=https://your-render-service.onrender.com`
- `SSLCOMMERZ_STORE_ID`
- `SSLCOMMERZ_STORE_PASS`
- `cloud_name`
- `api_key`
- `api_secret`

Use [`frontend/.env.example`](/d:/Splash-Electronics/frontend/.env.example) and [`backend/.env.example`](/d:/Splash-Electronics/backend/.env.example) as the variable reference.

### Deploy Order
1. Deploy the backend to Render and copy its public URL.
2. Set `REACT_APP_API_URL` in Vercel using that Render URL plus `/api`.
3. Deploy the frontend to Vercel.
4. Update Render `FRONTEND_URL` and `CORS_ORIGINS` with the final Vercel domain if it changed after first deploy.

---

## 🧩 System Architecture
<img width="850" height="1100" alt="System Architechture drawio(1)" src="https://github.com/user-attachments/assets/cca18ea0-147a-4010-815c-1200a114ee03" />



