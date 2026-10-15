# BEST ELECTRICAL Owner Contact Sync (Android)

This is a separate owner-only companion app inside the mobile repository. It does not replace the customer-facing shopping app at the repository root. Customers do not install this companion app.

## Setup
1. Install dependencies:
   \`\`\`bash
   cd owner-contact-sync
   npm install
   npx expo install --fix
   \`\`\`
2. Configure the backend host with a random \`ADMIN_API_KEY\` value of at least 24 characters and a working MongoDB connection.
3. Start for development with \`npx expo start\`, or build an installable internal Android APK:
   \`\`\`bash
   npx eas-cli@latest build --platform android --profile preview
   \`\`\`
4. Open the installed companion app on the shop owner's phone, enter the backend API URL and ADMIN_API_KEY, confirm contact handling, grant Android Contacts permission, and tap **Sync all phone contacts**.

## Data handling
- Reads names and phone numbers only; does not read email, contact photos, addresses or notes.
- Deduplicates entries on device and sends names/phone numbers in small batches to \`POST /api/admin/marketing/contacts/import\`.
- Contact import does not grant SMS or WhatsApp marketing consent. Server-side defaults leave both channels opted out.
- No messages are sent from this app. Campaigns are created and queued from the admin website.
- The admin key is held in memory for the current session; do not commit it or place it in a public build-time variable.
- Sync is owner-initiated after system permission. No silent/background address-book upload.

Before a live marketing campaign, record actual channel-specific customer opt-in, configure provider credentials and comply with the selected providers' terms and applicable Indian DLT requirements.
