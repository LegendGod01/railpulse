# RailPulse 🚆

**RailPulse** is a comprehensive Indian Railways utility dashboard designed to provide real-time railway data. From checking live train status to PNR inquiries and seat availability, RailPulse serves as a one-stop solution for travelers.

## 🚀 Live Demo
Access the live application here: [railpulse-six.vercel.app](https://railpulse-six.vercel.app)

## ✨ Key Features
- **Live Train Status:** Track your train's real-time location and expected arrival/departure delays using RailRadar data.
- **PNR Status:** Instant PNR status updates with detailed passenger info and chart status.
- **Station Live Board:** Get live arrival/departure updates for any station using their station code.
- **Trains Between Stations:** Easily search for available trains between any two stations.
- **Seat Availability & Fare:** Check real-time seat availability (WL/RAC/CNF) and detailed fare breakdowns (Base fare, GST, etc.) powered by RailKit.

## 🛠 Tech Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Vercel Serverless Functions (`/api/railkit.js`)
- **APIs Used:**
  - RailRadar (Live Status & Schedule)
  - RailKit API (Seats, Fare, Search)
  - RapidAPI (PNR & Station Boards)
- **Deployment:** Vercel

## 📂 Project Structure
- `api/` - Serverless backend functions for secure API handling.
- `api.js` - Centralized API layer for fetching and normalizing data.
- `config.js` - Configuration management for API keys and endpoints.
- `index.html`, `style.css`, `script.js` - Core frontend files.

## ⚙️ How to Deploy
This project is built to run on Vercel:
1. Fork this repository.
2. Import the repository into your Vercel dashboard.
3. Configure your API keys (RapidAPI/RailKit) in your environment variables.
4. Deploy!

## 👨‍💻 Developed by
**Amit Kumar Mishra (LegendGod01)**

---
*Built with ❤️ for the Indian Railways Community.*
