import { VercelRequest, VercelResponse } from '@vercel/node';
import dns from 'dns/promises';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

// Email regex for syntax validation
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Function to check MX records
async function checkMxRecords(domain: string): Promise<boolean> {
    try {
        const mxRecords = await dns.resolveMx(domain);
        return mxRecords.length > 0;
    } catch {
        return false;
    }
}

// Function to check if the email is disposable
async function isDisposable(domain: string): Promise<boolean> {
    try {
        const disposableDomains = (await fs.readFile('disposable_domains.txt', 'utf-8')).split('\n');
        return disposableDomains.includes(domain.trim());
    } catch (error) {
        console.error("Error reading disposable domains list:", error);
        return false;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const email = req.query.email as string;

    if (!email) {
        return res.status(400).json({ error: "Missing email parameter" });
    }

    // Syntax validation
    const syntaxValid = emailRegex.test(email);
    const domain = email.split('@')[1];

    if (!syntaxValid) {
        return res.status(400).json({ email, syntax_valid: false, message: "Invalid email format" });
    }

    // MX record validation
    const mxValid = await checkMxRecords(domain);

    // Disposable email check
    const disposable = await isDisposable(domain);

    // Response with validation results
    return res.status(200).json({
        email,
        syntax_valid: syntaxValid,
        mx_valid: mxValid,
        disposable: disposable
    });
}
