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

// Generate HTML email template
const generateOtpEmailHtml = ({ userName, otp, hasLogo }) => {
    return `
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
    `;
};

/**
 * Send email using Resend HTTP API (Port 443 HTTPS - Never blocked by Render or cloud firewalls)
 */
const sendViaResend = async ({ to, userName, otp, subject, html }) => {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) return null;

    const fromAddress = process.env.RESEND_FROM || 'Nadoda Connect <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: fromAddress,
            to: [to],
            subject,
            html
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || `Resend API failed with status ${res.status}`);
    }

    console.log(`[EmailService - Resend] OTP email delivered to ${to}, id: ${data.id}`);
    return { sent: true, messageId: data.id, provider: 'resend' };
};

/**
 * Send email using Brevo HTTP API (Port 443 HTTPS - Never blocked by Render)
 */
const sendViaBrevo = async ({ to, userName, otp, subject, html }) => {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!apiKey) return null;

    const senderEmail = (process.env.EMAIL_USER || process.env.BREVO_SENDER || 'nadoda.connect@gmail.com').trim();

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sender: { name: 'શ્રી નાડોદા રાજપૂત સમાજ', email: senderEmail },
            to: [{ email: to, name: userName }],
            subject,
            htmlContent: html
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || `Brevo API failed with status ${res.status}`);
    }

    console.log(`[EmailService - Brevo] OTP email delivered to ${to}, id: ${data.messageId}`);
    return { sent: true, messageId: data.messageId, provider: 'brevo' };
};

/**
 * Send email using SMTP (Nodemailer) with IPv4 forcing and timeout protections
 */
const sendViaSmtp = async ({ to, userName, otp, subject, html, logoPath, hasLogo }) => {
    const user = (process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
    const rawPass = (process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();
    const pass = rawPass.replace(/\s+/g, ''); // Remove spaces from 16-char Google app password

    if (!user || !pass) {
        console.log(`[EmailService - Simulated] To: ${to} | Name: ${userName} | OTP: ${otp}`);
        return {
            sent: false,
            simulated: true,
            message: 'Email credentials not configured in backend/.env'
        };
    }

    const mailOptions = {
        from: `"શ્રી નાડોદા રાજપૂત સમાજ (Nadoda Connect)" <${user}>`,
        to,
        subject,
        attachments: hasLogo ? [
            {
                filename: 'nododa_rajput.png',
                path: logoPath,
                cid: 'communityLogo'
            }
        ] : [],
        html
    };

    // Attempt 1: Port 465 (Implicit SSL/TLS) with IPv4 forced
    try {
        const transporter465 = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user, pass },
            family: 4, // Force IPv4 to prevent IPv6 timeouts on Render/cloud
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000
        });

        const info = await transporter465.sendMail(mailOptions);
        console.log(`[EmailService - SMTP 465] OTP email sent to ${to}: ${info.messageId}`);
        return { sent: true, messageId: info.messageId, provider: 'smtp-465' };
    } catch (err465) {
        console.warn(`[EmailService] SMTP port 465 failed (${err465.message}). Retrying on port 587...`);

        // Attempt 2: Port 587 (STARTTLS)
        try {
            const transporter587 = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                requireTLS: true,
                auth: { user, pass },
                family: 4,
                connectionTimeout: 8000,
                greetingTimeout: 8000,
                socketTimeout: 10000
            });

            const info = await transporter587.sendMail(mailOptions);
            console.log(`[EmailService - SMTP 587] OTP email sent to ${to}: ${info.messageId}`);
            return { sent: true, messageId: info.messageId, provider: 'smtp-587' };
        } catch (err587) {
            console.error(`[EmailService Error]: SMTP port 587 also failed (${err587.message})`);
            throw new Error(`SMTP Delivery Failed: ${err465.message} / ${err587.message}`);
        }
    }
};

/**
 * Send Password Reset OTP Email
 * Automatically tries HTTP-based providers first (Resend / Brevo) if keys are provided,
 * otherwise uses fortified Nodemailer SMTP (port 465 -> 587).
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.userName - Recipient name
 * @param {string} options.otp - 6-digit verification OTP
 */
export const sendOtpEmail = async ({ to, userName = 'સભ્ય', otp }) => {
    const logoPath = getLogoPath();
    const hasLogo = Boolean(logoPath);
    const subject = `[Nadoda Connect] તમારો વેરિફિકેશન કોડ છે: ${otp}`;
    const html = generateOtpEmailHtml({ userName, otp, hasLogo });

    // 1. Check HTTP-based providers (Resend API)
    if (process.env.RESEND_API_KEY) {
        try {
            return await sendViaResend({ to, userName, otp, subject, html });
        } catch (err) {
            console.error('[EmailService] Resend failed, attempting fallback:', err.message);
        }
    }

    // 2. Check HTTP-based provider (Brevo API)
    if (process.env.BREVO_API_KEY) {
        try {
            return await sendViaBrevo({ to, userName, otp, subject, html });
        } catch (err) {
            console.error('[EmailService] Brevo failed, attempting fallback:', err.message);
        }
    }

    // 3. Nodemailer SMTP (Gmail or custom SMTP)
    return await sendViaSmtp({ to, userName, otp, subject, html, logoPath, hasLogo });
};
