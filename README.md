# ICT Innovation Center

A responsive website for the University of Nigeria, Nsukka ICT Innovation Center. It uses a small Node.js server and has no package dependencies.

## Run locally

Use Node.js 18 or later. Copy `.env.example` to `.env`, then set:

- `RESEND_API_KEY` to a newly rotated Resend API key (keep it server-side).
- `RESEND_FROM_EMAIL` to an address on a domain verified in Resend.
- `INNOVATION_EMAIL` to the Innovation Unit's recipient address.

Start the app with:

```text
node server.js
```

Open `http://localhost:3000`.

The Innovation Unit, meeting request, ID card, training registration, Software Unit website request, Hardware Unit repair request, and Portal Unit support request each have their own navigable page. The home page's Get in touch form and the meeting, software, hardware, and portal request forms are validated by the server and sent through Resend to the configured Innovation Unit recipient. Until the server's Resend settings are configured, forms report that email is unavailable; they do not pretend a request was sent.

## Integrations still needed

- **Recipient address:** the supplied `Ict.@unn.edu.ng` has a dot immediately before `@`, which standard email address validation generally rejects. Confirm a deliverable address with the university mail administrator before enabling email delivery.
- **Training payment and registration:** course fees are displayed (₦25,000 Basic Computer; ₦35,000 Coding), but the PayPal links and payment-verification/registration API have not been supplied. The Pay button is intentionally disabled, and student/guardian details are not submitted or stored.
- **Hardware and software requests:** the website and repair request forms send enquiries to the configured Innovation Unit email. Project and repair costs are agreed after the team reviews each request.
- **Student portal requests:** the portal support form sends the student's contact and issue details to the configured Innovation Unit email. Students should never include their password.
- **ID cards:** registration links to the supplied `https://bit.ly/IDQR-UNN` URL.
