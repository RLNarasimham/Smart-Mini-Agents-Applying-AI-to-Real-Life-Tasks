import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sessionsRoutes from "./routes/sessions.js";
import sandboxRoutes from "./routes/sandboxRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/sessions", sessionsRoutes);   // e.g. /api/sessions/create
app.use("/api/sandbox", sandboxRoutes);     // e.g. /api/sandbox/sessions/create, etc.

// Root test route
app.get("/", (req, res) => {
  res.send("✅ Backend is running...");
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
