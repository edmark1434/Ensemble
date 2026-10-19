const axios = require('axios');

function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function generateDynamicEmailHtml({ recipientName, content, links = [] }) {
    // Handle content whether passed as a single string or multiple paragraphs
    const paragraphs = Array.isArray(content) ? content : [content];
    const contentHtml = paragraphs
        .filter(Boolean)
        .map(p => `<p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 16px;">${escapeHtml(p)}</p>`)
        .join('');

    // Generate dynamic buttons/links
    const linksHtml = (links || []).filter(l => l?.url && l?.label).map((link, idx) => {
        const isPrimary = link.isPrimary !== undefined ? Boolean(link.isPrimary) : (idx === 0);
        const bg = isPrimary ? '#2563eb' : '#f4f4f5';
        const text = isPrimary ? '#ffffff' : '#18181b';
        const border = isPrimary ? '1px solid #2563eb' : '1px solid #e4e4e7';
        return `
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:12px 24px;margin:6px 8px;background:${bg};color:${text};border:${border};text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">
                ${escapeHtml(link.label)}
            </a>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
    <tr>
        <td align="center">
            <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e4e4e7;max-width:100%;">
                <!-- Logo -->
                <tr>
                    <td align="center" style="padding:32px 20px 12px;">
                        <img src="https://i.pinimg.com/736x/4c/0e/41/4c0e41b328ad5f3bc015686827b05fa9.jpg" width="100" alt="Ensemble" style="display:block;border-radius:8px;" />
                    </td>
                </tr>
                <!-- Main Content -->
                <tr>
                    <td style="padding:20px 40px 32px;text-align:left;">
                        <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">
                            Hi ${escapeHtml(recipientName || 'there')},
                        </h2>
                        ${contentHtml}
                        ${links.length > 0 ? `
                            <div style="text-align:center;margin:28px 0 16px;">
                                ${linksHtml}
                            </div>
                        ` : ''}
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td align="center" style="padding:20px;background:#fafafa;border-top:1px solid #eeeeee;font-size:12px;color:#71717a;">
                        &copy; ${new Date().getFullYear()} Ensemble. Sent from the Ensemble platform.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
`;
}

async function sendDynamicEmailService({ recipient, subject, content, links = [] }) {
    const email = (typeof recipient === 'string' ? recipient : recipient?.email || '').trim().toLowerCase();
    const name = (typeof recipient === 'object' ? recipient?.name : '') || 'Ensemble Member';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const error = new Error('A valid recipient email address is required.');
        error.statusCode = 400;
        throw error;
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
        const error = new Error('Email subject is required.');
        error.statusCode = 400;
        throw error;
    }

    if (!content || (Array.isArray(content) && content.length === 0)) {
        const error = new Error('Email content is required.');
        error.statusCode = 400;
        throw error;
    }

    // Sanitize links: ensure only http/https URLs are permitted and have a non-empty label
    const validLinks = (links || []).filter(l => {
        return l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url.trim()) && typeof l.label === 'string' && l.label.trim();
    }).map(l => ({
        label: l.label.trim(),
        url: l.url.trim(),
        isPrimary: l.isPrimary
    }));

    const htmlContent = generateDynamicEmailHtml({
        recipientName: name,
        content,
        links: validLinks,
    });

    if (!process.env.BREVO_API_KEY) {
        console.warn(`[DEV SIMULATOR] Brevo API Key not configured. Simulated send to ${email}:`, { subject, linksCount: validLinks.length });
        return { simulated: true, recipient: email, validLinksCount: validLinks.length };
    }

    const payload = {
        sender: {
            name: 'Ensemble',
            email: 'ensemble.support@ensemble.software',
        },
        to: [{ email, name }],
        subject: subject.trim(),
        htmlContent,
    };

    try {
        await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'Accept': 'application/json',
            },
            timeout: 10000,
        });

        return { simulated: false, recipient: email, validLinksCount: validLinks.length };
    } catch (err) {
        console.error('Failed to send dynamic email via Brevo:', err.response?.data || err.message);
        const error = new Error(err.response?.data?.message || 'Failed to send email via mail service provider.');
        error.statusCode = err.response?.status || 500;
        throw error;
    }
}

module.exports = {
    sendDynamicEmailService,
    generateDynamicEmailHtml
};
