# ICT Innovation Center

A responsive website for the University of Nigeria, Nsukka ICT Innovation Center. It uses a small Node.js server and has no package dependencies.

## Run locally

Use Node.js 18 or later.

Start the app with:

```text
node server.js
```

Open `http://localhost:3000`.

The Innovation Unit, meeting request, ID card, training registration, Software Unit website request, Hardware Unit repair request, and Portal Unit support request each have their own navigable page. The home page's Get in touch form and the meeting, software, hardware, and portal request forms are validated by the server and sent through Resend. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `INNOVATION_EMAIL` in `.env`; submissions are delivered to `INNOVATION_EMAIL`.

The home page shows five of the nine service units at a time in an asymmetric grid. Use the arrow controls below the grid to flip between the first five units and the remaining four.

The website displays ICT's public contact address (`ict@unn.edu.ng`). Set `INNOVATION_EMAIL` to the inbox that should receive submitted forms. Keep `.env` out of version control.

Training registration and payment are not connected: the Pay button is intentionally disabled, and student/guardian details are not submitted or stored.

## Integrations still needed

- **Email delivery:** verify the Resend sender domain and send a test request from the deployed site.
- **Training payment and registration:** course fees are displayed (₦25,000 Basic Computer; ₦35,000 Coding), but the PayPal links and payment-verification/registration API have not been supplied.
- **Hardware and software requests:** project and repair costs are agreed after the team reviews each request.
- **Student portal requests:** students should never include their password in a support request.
- **ID cards:** registration links to the supplied `https://bit.ly/IDQR-UNN` URL.
