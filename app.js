const pageViews = {
  home: document.querySelector("#home-view"),
  innovation: document.querySelector("#innovation-view"),
  meeting: document.querySelector("#meeting-view"),
  "id-card": document.querySelector("#id-card-view"),
  training: document.querySelector("#training-view"),
  software: document.querySelector("#software-view"),
  hardware: document.querySelector("#hardware-view"),
  portal: document.querySelector("#portal-view")
};

const safeStoredTheme = localStorage.getItem("ict-theme");
if (safeStoredTheme === "dark") document.body.classList.add("dark-theme");
document.querySelector(".theme-toggle").addEventListener("click", (event) => {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("ict-theme", isDark ? "dark" : "light");
  event.currentTarget.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
});

document.querySelector("#current-year").textContent = new Date().getFullYear();

function currentPage() {
  const page = new URLSearchParams(window.location.search).get("page");
  return Object.hasOwn(pageViews, page) ? page : "home";
}

function showPage(page, addHistory = true) {
  if (!Object.hasOwn(pageViews, page)) return;
  Object.entries(pageViews).forEach(([name, view]) => { view.hidden = name !== page; });
  if (addHistory) {
    const url = new URL(window.location.href);
    if (page === "home") url.searchParams.delete("page");
    else url.searchParams.set("page", page);
    window.history.pushState({ page }, "", `${url.pathname}${url.search}${url.hash}`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach((control) => {
  control.addEventListener("click", (event) => {
    event.preventDefault();
    const page = control.dataset.page;
    resetMeetingForm();
    document.querySelector("#training-registration").hidden = true;
    showPage(page);
  });
});
window.addEventListener("popstate", () => showPage(currentPage(), false));
showPage(currentPage(), false);

const meetingForm = document.querySelector("#meeting-form");
const meetingType = document.querySelector("#meeting-type");
const locationField = document.querySelector(".location-field");
const meetingStatus = document.querySelector("#meeting-status");

function resetMeetingForm() {
  meetingForm.hidden = true;
  meetingForm.reset();
  meetingType.value = "facility";
  locationField.hidden = true;
  locationField.querySelector("input").required = false;
  meetingForm.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  document.querySelectorAll(".meeting-choice").forEach((choice) => choice.classList.remove("selected"));
  meetingStatus.className = "form-status";
  meetingStatus.textContent = "We’ll contact you to discuss availability and pricing.";
}

document.querySelectorAll("[data-meeting-type]").forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.meetingType;
    resetMeetingForm();
    meetingType.value = type;
    locationField.hidden = type !== "outside";
    locationField.querySelector("input").required = type === "outside";
    document.querySelector("#meeting-form-type").textContent = type === "outside" ? "ON-SITE MEETING" : "FACILITY MEETING";
    document.querySelectorAll(".meeting-choice").forEach((choice) => choice.classList.toggle("selected", choice === button));
    meetingForm.hidden = false;
    meetingStatus.className = "form-status";
    meetingStatus.textContent = "We’ll contact you to discuss availability and pricing.";
    meetingForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

document.querySelector("[data-reset-meeting]").addEventListener("click", () => {
  resetMeetingForm();
});

function setFormStatus(message, state = "") {
  meetingStatus.textContent = message;
  meetingStatus.className = `form-status${state ? ` ${state}` : ""}`;
}

meetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = [...meetingForm.querySelectorAll("input[required], textarea[required], select[required]")];
  let firstInvalid = null;
  fields.forEach((field) => {
    const invalid = !field.value.trim();
    field.setAttribute("aria-invalid", String(invalid));
    if (invalid && !firstInvalid) firstInvalid = field;
  });
  if (firstInvalid) {
    setFormStatus("Please complete all required fields before submitting.", "error");
    firstInvalid.focus();
    return;
  }

  const submitButton = meetingForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Sending request…";
  setFormStatus("Sending your request securely…");
  const body = Object.fromEntries(new FormData(meetingForm).entries());
  try {
    const response = await fetch("/api/meeting-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We couldn’t send your request. Please try again.");
    meetingForm.reset();
    meetingType.value = body.meetingType;
    locationField.hidden = body.meetingType !== "outside";
    locationField.querySelector("input").required = body.meetingType === "outside";
    document.querySelectorAll(".meeting-choice").forEach((choice) => {
      choice.classList.toggle("selected", choice.dataset.meetingType === body.meetingType);
    });
    setFormStatus("Your request has been sent. The Innovation Unit will follow up with you.", "success");
  } catch (error) {
    setFormStatus(error.message || "We couldn’t send your request. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit request <span aria-hidden="true">↗</span>';
  }
});

const trainingRegistration = document.querySelector("#training-registration");
document.querySelector("[data-show-training-form]").addEventListener("click", () => {
  trainingRegistration.hidden = false;
  trainingRegistration.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector("#training-form input[name='name']").focus({ preventScroll: true });
});

const courseSelect = document.querySelector("#training-form select[name='course']");
const courseFee = document.querySelector("#course-fee");
courseSelect.addEventListener("change", () => {
  courseFee.textContent = courseSelect.value === "coding" ? "₦35,000" : "₦25,000";
});
document.querySelector("#training-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  document.querySelector(".payment-notice").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("[data-show-contact]").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const form = document.querySelector("#contact-form");
  form.hidden = false;
  button.setAttribute("aria-expanded", "true");
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  form.querySelector("input[name='name']").focus({ preventScroll: true });
});

document.querySelectorAll("[data-service-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = form.querySelector(".form-status");
    const submitButton = form.querySelector('button[type="submit"]');
    if (!form.reportValidity()) return;
    const body = Object.fromEntries(new FormData(form).entries());
    body.serviceType = form.dataset.serviceForm;
    submitButton.disabled = true;
    submitButton.textContent = "Sending request…";
    status.className = "form-status";
    status.textContent = "Sending your request securely…";
    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t send your request. Please try again.");
      status.className = "form-status success";
      status.textContent = "Your request has been sent. The relevant team will follow up with you.";
    } catch (error) {
      status.className = "form-status error";
      status.textContent = error.message || "We couldn’t send your request. Please try again.";
    } finally {
      submitButton.disabled = false;
      const labels = {
        contact: "Send message",
        software: "Submit website request",
        hardware: "Submit repair request",
        portal: "Submit portal support request"
      };
      submitButton.innerHTML = `${labels[form.dataset.serviceForm]} <span aria-hidden="true">↗</span>`;
    }
  });
});
