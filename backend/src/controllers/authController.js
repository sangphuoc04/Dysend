import bcrypt from "bcrypt";
import User from "../models/User.js";
import Session from "../models/Session.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";


const ACCESS_TOKEN_TTL = '30m'; 
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;


export const signUp = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName } = req.body;

        if(!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const duplicate = await User.findOne({username});
        if (duplicate) {
            return res.status(409).json({ message: "Username already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        await User.create({
            username,
            hashedPassword,
            email,
            displayName: `${firstName} ${lastName}`,
        });

        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: error.message });
    }
};  

export const signIn = async (req, res) => {
    try{
        const { username, password } = req.body;
        if(!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordCorrect) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const accessToken = jwt.sign({userId: user._id}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

        const refreshToken = crypto.randomBytes(64).toString('hex');

        await Session.create({
            UserId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL,
        }); 

        res.status(200).json({message: `User ${user.username} logged in successfully`, accessToken});
    }
    catch (error) {
        console.error("Error signing in:", error);
        res.status(500).json({ message: error.message });
    }
};

export const signOut = async (req, res) => {
    try{
        const token = req.cookies?.refreshToken;
        if (!token) {
            await Session.deleteOne({ refreshToken: token });
            res.clearCookie('refreshToken');
        }

        return res.sendStatus(204);
    }
    catch (error) {
        console.error("Error signing out:", error);
        res.status(500).json({ message: error.message });
    }
}

export const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "Refresh token invalid" });
        }

        const session = await Session.findOne({ refreshToken: token });
        if (!session || session.expiresAt < new Date()) {
            return res.status(403).json({ message: "Refresh token invalid or expired" });
        }

        if (session.expiresAt < new Date()) {
            return res.status(403).json({ message: "Refresh token expired" });
        }

        const accessToken = jwt.sign({ userId: session.UserId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
        res.status(200).json({ accessToken });
    }
    catch (error) {
        console.error("Error refreshing token:", error);
        res.status(500).json({ message: error.message });
    }
}