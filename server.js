import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import createAdminUser from './config/seedAdmin.js';
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import bookRequestRoutes from './routes/bookRequestRoutes.js';
import bookIssueRoutes from './routes/bookIssueRoutes.js';





const app = express();

app.use(bodyParser.json());
dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGOURL = process.env.MONGOURL;

mongoose.connect(MONGOURL).then(async () => {
    console.log("Database Connected Successfully.");
    
    await createAdminUser();
    
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => console.log(error));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/book-requests', bookRequestRoutes);
app.use('/api/book-issues', bookIssueRoutes);




