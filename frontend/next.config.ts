import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/api/chatbot': ['./data/chatbot-knowledge.json', './data/chatbot-ocr.json', './data/chatbot-visuals.json', './data/chatbot-extra.json', './data/chatbot-extra-ocr.json', './data/chatbot-extra-visuals.json', './data/chatbot-page-visuals.json'],
    '/api/chatbot/images/*': ['./data/chatbot-visuals.json', './data/chatbot-visuals.zip', './data/chatbot-extra-visuals.json', './data/chatbot-extra-visuals.zip'],
    '/api/chatbot/pages/*': ['./data/chatbot-page-visuals.json', './data/chatbot-page-visuals-*.zip'],
    '/api/matrix/export': ['./templates/risk-profile-form.docx'],
    '/api/matrix/export-pdf': ['./public/risk-profile/risk-profile-form.pdf', './public/fonts/Sarabun-Regular.ttf'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Next.js และ React ใช้ inline style/script สำหรับ hydration จึงยังต้องอนุญาต unsafe-inline
            // แต่จำกัดทุก resource ให้มาจากเว็บเอง; รูปโปรไฟล์อนุญาต HTTPS เท่านั้น
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default config;
