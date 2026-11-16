# ICT Innovation Center

A responsive website for the University of Nigeria, Nsukka ICT Innovation Center. It uses a small Node.js server and has no package dependencies.

## Run locally

Use Node.js 18 or later.

Start the app with:

```text
node server.js
```

Open `http://localhost:3000`.

The Innovation Unit, meeting request, ID card, training registration, Software Unit website request, Hardware Unit repair request, and Portal Unit support request each have their own navigable page. The home page's Get in touch form and the meeting, software, hardware, and portal request forms are validated by the server and sent through EmailJS using the `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, and `EMAILJS_PUBLIC_KEY` values in `.env`.

The EmailJS template should be configured with the Innovation Center's recipient address. It can use `{{from_name}}`, `{{from_email}}`, `{{reply_to}}`, `{{service_type}}`, `{{subject}}`, and `{{message}}`. The browser submits to the local server, which sends the EmailJS request; keep `.env` out of version control.

The server's older Resend-backed API routes remain available for compatibility, but the website forms now use EmailJS. Training registration and payment are not connected: the Pay button is intentionally disabled, and student/guardian details are not submitted or stored.

## Integrations still needed

- **Email delivery:** verify the EmailJS template's recipient and message layout, then submit a test request from the deployed site.
- **Training payment and registration:** course fees are displayed (₦25,000 Basic Computer; ₦35,000 Coding), but the PayPal links and payment-verification/registration API have not been supplied.
- **Hardware and software requests:** project and repair costs are agreed after the team reviews each request.
- **Student portal requests:** students should never include their password in a support request.
- **ID cards:** registration links to the supplied `https://bit.ly/IDQR-UNN` URL.
