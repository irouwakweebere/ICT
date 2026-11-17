const pageViews = {
  home: document.querySelector("#home-view"),
  about: document.querySelector("#about-view"),
  innovation: document.querySelector("#innovation-view"),
  meeting: document.querySelector("#meeting-view"),
  "id-card": document.querySelector("#id-card-view"),
  training: document.querySelector("#training-view"),
  software: document.querySelector("#software-view"),
  hardware: document.querySelector("#hardware-view"),
  portal: document.querySelector("#portal-view")
};

document.querySelector("#current-year").textContent = new Date().getFullYear();

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The server returned an unexpected response. Please try again.");
  }
}

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
  window.scrollTo({ top: 0 });
}

function goToUnitsSection() {
  showPage("home", false);
  const unitsSection = document.querySelector("#units");
  if (unitsSection) {
    requestAnimationFrame(() => {
      const yOffset = unitsSection.getBoundingClientRect().top + window.scrollY - 18;
      window.scrollTo({ top: yOffset });
    });
  }
}

document.querySelectorAll('a[href="#units"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    goToUnitsSection();
  });
});

document.querySelectorAll("[data-page]").forEach((control) => {
  control.addEventListener("click", (event) => {
    event.preventDefault();
    const page = control.dataset.page;
    if (page === "home") {
      goToUnitsSection();
      return;
    }
    resetMeetingForm();
    document.querySelector("#training-registration").hidden = true;
    showPage(page);
  });
});
window.addEventListener("popstate", () => showPage(currentPage(), false));
showPage(currentPage(), false);

const unitGrid = document.querySelector("#unit-grid");
const unitCards = [...unitGrid.querySelectorAll("[data-unit-card]")];
const unitPageLabel = document.querySelector("#unit-page-label");
const unitPreviousButton = document.querySelector("#unit-page-previous");
const unitNextButton = document.querySelector("#unit-page-next");
const unitPageStatus = document.querySelector("#unit-page-status");
const unitsPerPage = 5;
let unitPage = 0;
let unitPageTransitioning = false;

function changeUnitPage(nextPage) {
  if (nextPage === unitPage || unitPageTransitioning) return;

  const start = nextPage * unitsPerPage;
  const end = Math.min(start + unitsPerPage, unitCards.length);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const direction = nextPage > unitPage ? "next" : "previous";
  const visibleCards = unitCards.filter((card) => !card.hidden);
  const enteringCards = unitCards.slice(start, end);

  function orderCards(cards, rightToLeft) {
    const ordered = [...cards].sort((first, second) => {
      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      const horizontalDifference = rightToLeft
        ? secondRect.right - firstRect.right
        : firstRect.left - secondRect.left;
      return horizontalDifference || firstRect.top - secondRect.top;
    });
    ordered.forEach((card, index) => {
      card.style.setProperty("--flip-order", index);
    });
  }

  unitPageTransitioning = true;
  unitPreviousButton.disabled = true;
  unitNextButton.disabled = true;
  unitGrid.dataset.direction = direction;
  orderCards(visibleCards, direction === "next");

  const updateGrid = () => {
    unitPage = nextPage;
    unitGrid.dataset.page = nextPage === 0 ? "first" : "second";
    unitCards.forEach((card, index) => {
      card.hidden = index < start || index >= end;
    });
    unitPageLabel.textContent = nextPage === 0 ? "View other units" : "View first five units";
    unitPreviousButton.hidden = nextPage === 0;
    unitNextButton.hidden = nextPage === 1;
    unitPreviousButton.setAttribute("aria-label", "View first five units");
    unitNextButton.setAttribute("aria-label", "View other units");
    unitPageStatus.textContent = `Showing units ${start + 1}–${end} of ${unitCards.length}`;

    if (reducedMotion) {
      unitGrid.classList.remove("is-flipping", "is-entering", "is-settling");
      unitPageTransitioning = false;
      unitPreviousButton.disabled = false;
      unitNextButton.disabled = false;
      (nextPage === 0 ? unitNextButton : unitPreviousButton).focus();
      return;
    }

    orderCards(enteringCards, direction === "previous");
    unitGrid.classList.remove("is-flipping");
    unitGrid.classList.add("is-entering");
    unitGrid.offsetWidth;
    unitGrid.classList.add("is-settling");

    window.setTimeout(() => {
      unitGrid.classList.remove("is-entering", "is-settling");
      unitPageTransitioning = false;
      unitPreviousButton.disabled = false;
      unitNextButton.disabled = false;
      (nextPage === 0 ? unitNextButton : unitPreviousButton).focus();
    }, 600);
  };

  if (reducedMotion) {
    updateGrid();
    return;
  }

  unitGrid.classList.add("is-flipping");
  window.setTimeout(updateGrid, 560);
}

unitPreviousButton.addEventListener("click", () => changeUnitPage(0));
unitNextButton.addEventListener("click", () => changeUnitPage(1));

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
    meetingForm.scrollIntoView({ block: "nearest" });
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
    const result = await readJsonResponse(response);
    if (!response.ok || !result) {
      throw new Error((result && result.error) || "We couldn’t send your request. Please try again.");
    }
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
  trainingRegistration.scrollIntoView({ block: "start" });
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
  document.querySelector(".payment-notice").scrollIntoView({ block: "center" });
});

document.querySelector("[data-show-contact]").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const form = document.querySelector("#contact-form");
  const isOpening = form.hidden;
  form.hidden = !isOpening;
  button.setAttribute("aria-expanded", String(isOpening));
  if (isOpening) {
    form.scrollIntoView({ block: "nearest" });
    form.querySelector("input[name='name']").focus({ preventScroll: true });
  }
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
      const result = await readJsonResponse(response);
      if (!response.ok || !result) {
        throw new Error((result && result.error) || "We couldn’t send your request. Please try again.");
      }
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
