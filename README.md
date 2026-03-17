# ComplejoCanchas 🏟️  
Court booking + online payments (Mercado Pago) + admin dashboard.

**Live demo:** https://complejo-canchas.vercel.app/  
**API:** https://complejocanchas-production.up.railway.app  

## Overview
ComplejoCanchas is a full-stack reservation system for a sports complex. Users can check court availability, create a reservation, pay a deposit via **Mercado Pago**, and receive confirmation. An **admin panel** allows managing courts and reservations.

### Key Features
- ✅ Court availability by date/time
- ✅ Reservation flow with a **hold** (temporary reservation) + Mercado Pago checkout
- ✅ Payment confirmation via **Mercado Pago Webhooks**
- ✅ Reservation status lifecycle: `PENDING_PAYMENT → ACTIVE → (CANCELED / EXPIRED)`
- ✅ Cancel reservation via secure token
- ✅ Admin authentication + role-based access
- ✅ Cron jobs to expire unpaid holds automatically
- ✅ PostgreSQL + Prisma ORM

---

## Tech Stack

### Frontend
- **Next.js (App Router)**
- **React + TypeScript**
- **TailwindCSS**
- Deployed on **Vercel**

### Backend
- **NestJS + TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **Mercado Pago API**
- Deployed on **Railway**

---

## Repository Structure
/frontend → Next.js app (UI)
/backend → NestJS API (business logic, DB, payments)
