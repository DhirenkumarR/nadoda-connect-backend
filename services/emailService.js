import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find the logo image path
const getLogoPath = () => {
    const candidates = [
        path.resolve(__dirname, '../assets/nododa_rajput.png'),
        path.resolve(__dirname, '../../nododa_rajput.png'),
        path.resolve(process.cwd(), 'assets/nododa_rajput.png'),
        path.resolve(process.cwd(), 'nododa_rajput.png'),
        path.resolve(process.cwd(), '../nododa_rajput.png')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
};

let cachedTransporter = null;

// Get or create pooled transporter
const getTransporter = () => {
    if (cachedTransporter) return cachedTransporter;

    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,
        maxConnections: 3,
        auth: { user, pass }
    });

    return cachedTransporter;
};

/**
 * Send Password Reset OTP Email
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.userName - Recipient name
 * @param {string} options.otp - 6-digit verification OTP
 */
export const sendOtpEmail = async ({ to, userName = 'સભ્ય', otp }) => {
    const transporter = getTransporter();

    // If email credentials not configured in .env, simulate and log
    if (!transporter) {
        console.log(`[EmailService - Simulated] To: ${to} | Name: ${userName} | OTP: ${otp}`);
        return {
            sent: false,
            simulated: true,
            message: 'Email credentials not configured in backend/.env. OTP generated successfully.'
        };
    }

    const logoPath = getLogoPath();
    const hasLogo = Boolean(logoPath);

    const mailOptions = {
        from: `"શ્રી નાડોદા રાજપૂત સમાજ (Nadoda Connect)" <${process.env.EMAIL_USER || process.env.GMAIL_USER}>`,
        to,
        subject: `[Nadoda Connect] તમારો વેરિફિકેશન કોડ છે: ${otp}`,
        attachments: hasLogo ? [
            {
                filename: 'nododa_rajput.png',
                path: logoPath,
                cid: 'communityLogo'
            }
        ] : [],
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0B1120; margin: 0; padding: 20px; color: #F8FAFC; }
                .container { max-width: 520px; margin: 0 auto; background: #131E36; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                .header { text-align: center; margin-bottom: 24px; }
                .logo-img { width: 76px; height: 76px; border-radius: 50%; border: 3px solid #F59E0B; margin: 0 auto 14px; display: block; object-fit: cover; }
                .title { font-size: 20px; font-weight: bold; color: #FFFFFF; margin: 0; }
                .subtitle { font-size: 13px; color: #F59E0B; margin-top: 4px; }
                .content { line-height: 1.6; color: #CBD5E1; font-size: 15px; margin: 20px 0; }
                .otp-box { background: rgba(245, 158, 11, 0.1); border: 2px dashed #F59E0B; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
                .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #FBBF24; font-family: monospace; }
                .footer { font-size: 12px; color: #64748B; text-align: center; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    ${hasLogo 
                        ? '<img src="cid:communityLogo" alt="શ્રી નાડોદા રાજપૂત સમાજ" class="logo-img" />' 
                        : '<div style="display:inline-block;width:48px;height:48px;line-height:48px;background:linear-gradient(135deg,#F59E0B,#B45309);color:#0F172A;font-size:24px;font-weight:bold;border-radius:12px;margin-bottom:12px;">ના</div>'
                    }
                    <h2 class="title">શ્રી નાડોદા રાજપૂત સમાજ</h2>
                    <div class="subtitle">Nadoda Connect - પાસવર્ડ વેરિફિકેશન</div>
                </div>
                <div class="content">
                    <p>નમસ્તે <strong>${userName}</strong>,</p>
                    <p>તમારા એકાઉન્ટ માટે પાસવર્ડ સેટઅપ અથવા રીસેટ કરવાની વિનંતી પ્રાપ્ત થઈ છે. તમારો ૬-અંકનો સુરક્ષા વેરિફિકેશન કોડ નીચે મુજબ છે:</p>
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                    <p style="font-size: 13px; color: #94A3B8;">આ કોડ <strong>૧૫ મિનિટ</strong> માટે માન્ય છે. સુરક્ષા ખાતર આ કોડ કોઈની સાથે શેર કરશો નહીં.</p>
                </div>
                <div class="footer">
                    શ્રી નાડોદા રાજપૂત સમાજ ડિજિટલ ડિરેક્ટરી પ્લેટફોર્મ • Nadoda Connect
                </div>
            </div>
        </body>
        </html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] OTP email sent to ${to}: ${info.messageId}`);
        return { sent: true, messageId: info.messageId };
    } catch (error) {
        console.error('[EmailService Error]:', error.message);
        throw error;
    }
};
