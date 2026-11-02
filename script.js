"use strict";

const config = window.DMM_CONFIG || {};
const supabaseReady = Boolean(
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  window.supabase &&
  window.supabase.createClient
);
const db = supabaseReady
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;
const form = document.querySelector("#booking-form");
const bookingDate = form?.elements.booking_date;
const bookingService = form?.elements.service;
const bookingTime = document.querySelector("#booking-time");
const feedback = document.querySelector("#booking-feedback");
const adminOverlay = document.querySelector("#admin-overlay");
const loginForm = document.querySelector("#login-form");
const loginFeedback = document.querySelector("#login-feedback");
const dashboard = document.querySelector("#dashboard");
const loginSection = document.querySelector("#admin-login");
const calendarGrid = document.querySelector("#calendar-grid");
const bookingList = document.querySelector("#booking-list");
const monthNames = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dateNames = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const services = [
  "Móveis em geral",
  "Armários e cozinhas planejadas",
  "Desmontagem e remontagem",
  "Outro — vou explicar nos detalhes",
];
const heroPhotos = [
  {
    caption: "Montador conferindo o alinhamento com nível",
    image: "https://images.pexels.com/photos/8470044/pexels-photo-8470044.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/a-man-in-black-long-sleeves-checking-the-white-wall-using-spirit-level-8470044/",
  },
  {
    caption: "Carpinteiro usando furadeira em uma peça de madeira",
    image: "https://images.pexels.com/photos/5974387/pexels-photo-5974387.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/unrecognizable-guy-drilling-wooden-board-in-workshop-5974387/",
  },
  {
    caption: "Montador usando furadeira em um móvel",
    image: "https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/person-using-dewalt-cordless-impact-driver-on-brown-board-1249611/",
  },
  {
    caption: "Montador trabalhando em uma peça de madeira",
    image: "https://images.pexels.com/photos/5974053/pexels-photo-5974053.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/man-drilling-wooden-plank-on-desk-5974053/",
  },
  {
    caption: "Carpinteiro usando ferramenta elétrica na montagem",
    image: "https://images.pexels.com/photos/6790937/pexels-photo-6790937.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/close-up-shot-of-a-carpenter-using-an-impact-driver-6790937/",
  },
  {
    caption: "Montador fazendo furos em uma peça de madeira",
    image: "https://images.pexels.com/photos/5974382/pexels-photo-5974382.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/unrecognizable-man-drilling-hole-in-wooden-blank-5974382/",
  },
  {
    caption: "Montador medindo uma peça antes da montagem",
    image: "https://images.pexels.com/photos/5973888/pexels-photo-5973888.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/crop-man-using-measuring-tape-in-workshop-5973888/",
  },
  {
    caption: "Carpinteiro usando furadeira em uma bancada",
    image: "https://images.pexels.com/photos/5974049/pexels-photo-5974049.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/crop-man-drilling-holes-in-wooden-plank-5974049/",
  },
  {
    caption: "Carpinteiro martelando um prego durante o trabalho",
    image: "https://images.pexels.com/photos/5974413/pexels-photo-5974413.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/focused-ethnic-male-carpenter-hammering-nail-into-wooden-detail-in-workshop-5974413/",
  },
  {
    caption: "Carpinteiro instalando uma dobradiça em madeira",
    image: "https://images.pexels.com/photos/7285919/pexels-photo-7285919.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/putting-of-hinge-on-a-wood-7285919/",
  },
];
const bookingFields = "id,customer_name,customer_phone,customer_email,service,details,booking_date,booking_time,duration_minutes,status";
let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDate = dateToISO(new Date());
let monthBookings = [];
let monthBlocks = [];
let toastTimer;
let clientBookingsEnabled = false;

function dateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setFeedback(element, message, isSuccess = false) {
  element.textContent = message;
  element.classList.toggle("success", isSuccess);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3400);
}

function formatWhatsappNumber(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function setBookingAvailability(enabled) {
  if (!form) return;
  clientBookingsEnabled = enabled;
  for (const element of form.querySelectorAll("input, select, textarea, button")) {
    element.disabled = !enabled;
  }
  bookingTime.innerHTML = enabled
    ? '<option value="">Escolha uma data primeiro</option>'
    : '<option value="">Agenda online em configuração</option>';
  if (!enabled) {
    setFeedback(feedback, "Os agendamentos online serão ativados após a configuração segura do serviço de agenda.");
  }
}

function setupContactLinks() {
  const phone = (config.whatsappNumber || "").replace(/\D/g, "");
  const contactEmail = (config.contactEmail || "").trim();
  for (const link of document.querySelectorAll("[data-whatsapp]")) {
    if (phone) {
      link.href = `https://wa.me/${phone}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "Conversar pelo WhatsApp");
    } else {
      link.hidden = true;
    }
  }
  for (const link of document.querySelectorAll("[data-email]")) {
    if (contactEmail) {
      link.href = `mailto:${contactEmail}`;
    } else {
      link.hidden = true;
    }
  }
  for (const area of document.querySelectorAll("[data-area]")) {
    area.textContent = config.serviceArea || "Consulte a disponibilidade para a sua região.";
  }
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

function setupHeroCarousel() {
  const image = document.querySelector("#hero-carousel-image");
  const caption = document.querySelector("#carousel-caption");
  const source = document.querySelector("#photo-credit");
  const dots = document.querySelector("#carousel-dots");
  const counter = document.querySelector("#carousel-counter");
  const toggle = document.querySelector("#carousel-toggle");
  if (!image || !caption || !source || !dots || !counter || !toggle) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentIndex = 0;
  let timer;
  let paused = reducedMotion.matches;
  let hovering = false;
  let focused = false;

  function stopTimer() {
    window.clearInterval(timer);
    timer = undefined;
  }

  function startTimer() {
    stopTimer();
    if (paused || hovering || focused || document.hidden || heroPhotos.length < 2) return;
    timer = window.setInterval(() => showPhoto(currentIndex + 1), 6000);
  }

  function showPhoto(index) {
    currentIndex = (index + heroPhotos.length) % heroPhotos.length;
    const photo = heroPhotos[currentIndex];
    image.src = photo.image;
    image.alt = photo.caption;
    caption.textContent = photo.caption;
    source.href = photo.source;
    counter.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(heroPhotos.length).padStart(2, "0")}`;
    for (const [dotIndex, dot] of [...dots.children].entries()) {
      dot.setAttribute("aria-pressed", String(dotIndex === currentIndex));
    }
    if (currentIndex + 1 < heroPhotos.length) {
      const nextImage = new Image();
      nextImage.src = heroPhotos[currentIndex + 1].image;
    }
    startTimer();
  }

  for (const [index, photo] of heroPhotos.entries()) {
    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Mostrar foto ${index + 1}: ${photo.caption}`);
    dot.setAttribute("aria-pressed", String(index === currentIndex));
    dot.addEventListener("click", () => showPhoto(index));
    dots.append(dot);
  }

  document.querySelector("#carousel-previous").addEventListener("click", () => showPhoto(currentIndex - 1));
  document.querySelector("#carousel-next").addEventListener("click", () => showPhoto(currentIndex + 1));
  toggle.addEventListener("click", () => {
    paused = !paused;
    toggle.textContent = paused ? "▶" : "Ⅱ";
    toggle.setAttribute("aria-label", paused ? "Iniciar carrossel" : "Pausar carrossel");
    startTimer();
  });
  image.addEventListener("error", () => {
    console.error(`Não foi possível carregar a foto do carrossel: ${image.src}`);
  });

  const carousel = image.closest(".hero-carousel");
  carousel.addEventListener("mouseenter", () => {
    hovering = true;
    stopTimer();
  });
  carousel.addEventListener("mouseleave", () => {
    hovering = false;
    startTimer();
  });
  carousel.addEventListener("focusin", () => {
    focused = true;
    stopTimer();
  });
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) {
      focused = false;
      startTimer();
    }
  });
  document.addEventListener("visibilitychange", startTimer);
  reducedMotion.addEventListener("change", (event) => {
    paused = event.matches;
    toggle.textContent = paused ? "▶" : "Ⅱ";
    toggle.setAttribute("aria-label", paused ? "Iniciar carrossel" : "Pausar carrossel");
    startTimer();
  });
  showPhoto(0);
}

async function loadAvailableSlots(date, service) {
  if (!service) {
    bookingTime.disabled = true;
    bookingTime.innerHTML = '<option value="">Escolha o serviço primeiro</option>';
    setFeedback(feedback, "Selecione o serviço para consultar os horários e a duração.");
    return;
  }
  bookingTime.disabled = true;
  bookingTime.innerHTML = '<option value="">Consultando horários...</option>';
  const { data, error } = await db.functions.invoke("booking-slots", { body: { date, service } });
  if (error) {
    bookingTime.innerHTML = '<option value="">Não foi possível carregar os horários</option>';
    const message = error.context?.status === 404
      ? "A consulta da agenda ainda não foi publicada no Supabase. A DMM Montagens precisa publicar a função booking-slots."
      : "Não foi possível consultar a agenda agora. Tente novamente em instantes ou fale pelo WhatsApp.";
    setFeedback(feedback, message);
    return;
  }
  if (!Array.isArray(data?.availableSlots)) {
    bookingTime.innerHTML = '<option value="">Agenda indisponível</option>';
    setFeedback(feedback, "A agenda retornou uma resposta inválida. Avise a DMM Montagens para verificar a configuração.");
    return;
  }
  bookingTime.innerHTML = "";
  const durationLabel = Number.isInteger(data.durationMinutes)
    ? `Escolha um horário · ${formatDuration(data.durationMinutes)}`
    : "Escolha um horário";
  if (data.availableSlots.length === 0) {
    bookingTime.add(new Option("Sem horários disponíveis", ""));
    setFeedback(feedback, "Não há horários livres neste dia. Escolha outra data.");
    return;
  }
  bookingTime.add(new Option(durationLabel, ""));
  for (const slot of data.availableSlots) {
    bookingTime.add(new Option(slot, slot));
  }
  bookingTime.disabled = false;
  setFeedback(feedback, "");
}

async function submitBooking(event) {
  event.preventDefault();
  if (!clientBookingsEnabled) {
    setFeedback(feedback, "A agenda online ainda não foi configurada. Entre em contato pelo WhatsApp.");
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Enviando pedido...";
  setFeedback(feedback, "");
  const { data: response, error } = await db.functions.invoke("create-booking", { body: data });
  submitButton.disabled = false;
  submitButton.innerHTML = 'Solicitar agendamento <span aria-hidden="true">↗</span>';
  if (error) {
    let responseBody;
    try {
      responseBody = await error.context?.json();
    } catch (parseError) {
      console.error("Could not read the booking error response:", parseError);
    }
    setFeedback(feedback, responseBody?.error || "Não foi possível enviar seu pedido. Confira sua conexão e tente novamente.");
    if (bookingDate.value) await loadAvailableSlots(bookingDate.value, bookingService.value);
    return;
  }
  if (response?.error) {
    setFeedback(feedback, response.error);
    if (response.code === "slot_taken" && bookingDate.value) {
      await loadAvailableSlots(bookingDate.value, bookingService.value);
    }
    return;
  }
  if (!response?.bookingId) {
    setFeedback(feedback, "A agenda retornou uma resposta inválida. Entre em contato com a DMM Montagens antes de tentar novamente.");
    return;
  }
  form.reset();
  bookingTime.innerHTML = '<option value="">Escolha um serviço e uma data primeiro</option>';
  bookingTime.disabled = true;
  if (response.notificationsSent) {
    setFeedback(feedback, "Pedido enviado! A DMM Montagens vai confirmar seu horário pelo WhatsApp ou e-mail.", true);
  } else {
    setFeedback(feedback, "Pedido salvo, mas houve um problema ao enviar os e-mails. Fale diretamente com a DMM Montagens para confirmar o horário.");
  }
}

function formatDateTitle(date) {
  const parsed = new Date(`${date}T12:00:00`);
  const value = dateNames.format(parsed);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function appendBookingField(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderBookingList() {
  const dayBookings = monthBookings
    .filter((booking) => booking.booking_date === selectedDate)
    .sort((left, right) => left.booking_time.localeCompare(right.booking_time));
  document.querySelector("#selected-day-title").textContent = formatDateTitle(selectedDate);
  document.querySelector("#day-count").textContent =
    `${dayBookings.length} ${dayBookings.length === 1 ? "compromisso" : "compromissos"}`;
  bookingList.replaceChildren();
  if (dayBookings.length === 0) {
    appendBookingField(bookingList, "p", "empty-day", "Nenhum agendamento para este dia.");
  }
  for (const booking of dayBookings) {
    const card = document.createElement("article");
    card.className = "admin-booking";
    appendBookingField(card, "span", "admin-booking-time", booking.booking_time);
    const details = document.createElement("div");
    details.className = "admin-booking-main";
    appendBookingField(details, "strong", "", booking.customer_name);
    appendBookingField(details, "small", "", `${booking.service} · ${formatDuration(booking.duration_minutes)}${booking.details ? ` · ${booking.details}` : ""}`);
    card.append(details);
    const contact = document.createElement("div");
    contact.className = "admin-booking-contact";
    const phoneLink = document.createElement("a");
    phoneLink.href = `https://wa.me/${formatWhatsappNumber(booking.customer_phone)}`;
    phoneLink.target = "_blank";
    phoneLink.rel = "noopener noreferrer";
    phoneLink.textContent = booking.customer_phone;
    contact.append(phoneLink);
    const emailLink = document.createElement("a");
    emailLink.href = `mailto:${booking.customer_email}`;
    emailLink.textContent = booking.customer_email;
    contact.append(emailLink);
    card.append(contact);
    const actions = document.createElement("div");
    actions.className = "admin-booking-actions";
    appendBookingField(actions, "span", `booking-status ${booking.status}`, statusLabel(booking.status));
    const select = document.createElement("select");
    select.className = "status-select";
    select.setAttribute("aria-label", `Alterar status do agendamento de ${booking.customer_name}`);
    for (const [value, label] of [
      ["pending", "Aguardando"],
      ["confirmed", "Confirmado"],
      ["completed", "Concluído"],
      ["cancelled", "Cancelado"],
    ]) {
      select.add(new Option(label, value, false, booking.status === value));
    }
    select.addEventListener("change", () => updateBookingStatus(booking.id, select.value, select));
    actions.append(select);
    card.append(actions);
    bookingList.append(card);
  }
  const dayBlocks = monthBlocks.filter((block) => block.blocked_date === selectedDate);
  updateScheduleControls(dayBlocks);
  for (const block of dayBlocks) {
    const card = document.createElement("article");
    card.className = "admin-booking schedule-block";
    appendBookingField(card, "span", "admin-booking-time", block.start_time
      ? `${String(block.start_time).slice(0, 5)}–${String(block.end_time).slice(0, 5)}`
      : "Dia todo");
    appendBookingField(card, "strong", "admin-booking-main", "Horário bloqueado");
    const removeButton = document.createElement("button");
    removeButton.className = "button button-outline";
    removeButton.type = "button";
    removeButton.textContent = "Liberar";
    removeButton.addEventListener("click", () => void removeScheduleBlock(block.id));
    card.append(removeButton);
    bookingList.append(card);
  }
}

function getWeekRange(dateValue) {
  const start = new Date(`${dateValue}T12:00:00`);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: dateToISO(start), end: dateToISO(end) };
}

function escapeICalendarText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function scheduleBlockConflicts(startTime, durationMinutes, blocks) {
  if (!startTime) return blocks.length > 0;
  const start = timeToMinutes(startTime);
  const end = start + durationMinutes;
  return blocks.some((block) =>
    block.start_time === null ||
    (start < timeToMinutes(block.end_time) && end > timeToMinutes(block.start_time))
  );
}

function updateScheduleControls(dayBlocks) {
  const dayButton = document.querySelector("#block-day-button");
  const startSelect = document.querySelector("#block-time");
  const durationSelect = document.querySelector("#block-duration");
  const timeButton = document.querySelector("#block-time-button");
  if (!dayButton || !startSelect || !durationSelect || !timeButton) return;

  const wholeDayBlocked = dayBlocks.some((block) => block.start_time === null);
  const selectedStart = startSelect.value;
  const duration = Number(durationSelect.value);
  const selectedPeriodBlocked = selectedStart &&
    (timeToMinutes(selectedStart) + duration > 18 * 60 ||
      scheduleBlockConflicts(selectedStart, duration, dayBlocks));
  dayButton.disabled = dayBlocks.length > 0;
  startSelect.disabled = wholeDayBlocked;
  durationSelect.disabled = wholeDayBlocked;
  timeButton.disabled = wholeDayBlocked || !selectedStart || selectedPeriodBlocked;
  dayButton.title = dayBlocks.length
    ? "Libere os bloqueios existentes antes de bloquear o dia todo."
    : "";
  timeButton.title = selectedPeriodBlocked
    ? "Esse período já está bloqueado ou termina depois das 18h."
    : "";
}

function foldICalendarLine(line) {
  const encoder = new TextEncoder();
  let folded = "";
  let currentLine = "";
  let currentBytes = 0;
  for (const character of line) {
    const characterBytes = encoder.encode(character).length;
    if (currentBytes + characterBytes > 75) {
      folded += `${currentLine}\r\n `;
      currentLine = "";
      currentBytes = 1;
    }
    currentLine += character;
    currentBytes += characterBytes;
  }
  return folded + currentLine;
}

function formatICalendarDate(date, time) {
  return new Date(`${date}T${time.slice(0, 5)}:00-03:00`)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function createCalendarFile(bookings) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DMM Montagens//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const booking of bookings) {
    const start = new Date(`${booking.booking_date}T${booking.booking_time.slice(0, 5)}:00-03:00`);
    const end = new Date(start.getTime() + booking.duration_minutes * 60_000);
    const startValue = formatICalendarDate(booking.booking_date, booking.booking_time);
    const endValue = end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const description = [
      booking.service,
      `Duração: ${formatDuration(booking.duration_minutes)}`,
      `WhatsApp: ${booking.customer_phone}`,
      booking.details,
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${booking.id}@dmm-montagens`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${startValue}`,
      `DTEND:${endValue}`,
      `SUMMARY:${escapeICalendarText(`${booking.service} - ${booking.customer_name}`)}`,
      `DESCRIPTION:${escapeICalendarText(description)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldICalendarLine).join("\r\n")}\r\n`;
}

async function exportConfirmedWeek(button) {
  const { start, end } = getWeekRange(selectedDate);
  button.disabled = true;
  try {
    const { data, error } = await db.from("bookings")
      .select(bookingFields)
      .eq("status", "confirmed")
      .gte("booking_date", start)
      .lte("booking_date", end)
      .order("booking_date")
      .order("booking_time");
    if (error) {
      showToast(`Não foi possível exportar a semana: ${error.message}`);
      return;
    }
    if (data.length === 0) {
      showToast("Não há agendamentos confirmados nesta semana.");
      return;
    }
    const blob = new Blob([createCalendarFile(data)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dmm-agenda-${start}-${end}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast(`${data.length} ${data.length === 1 ? "agendamento exportado" : "agendamentos exportados"} para a agenda.`);
  } finally {
    button.disabled = false;
  }
}

async function addScheduleBlock(startTime = null, durationMinutes = 90) {
  if (!db) return;
  if (startTime && timeToMinutes(startTime) + durationMinutes > 18 * 60) {
    showToast("O bloqueio precisa terminar até 18h. Escolha um período menor.");
    return;
  }
  const dayButton = document.querySelector("#block-day-button");
  const timeButton = document.querySelector("#block-time-button");
  const startSelect = document.querySelector("#block-time");
  const durationSelect = document.querySelector("#block-duration");
  dayButton.disabled = true;
  timeButton.disabled = true;
  startSelect.disabled = true;
  durationSelect.disabled = true;

  const endTime = startTime
    ? `${String(Math.floor((timeToMinutes(startTime) + durationMinutes) / 60)).padStart(2, "0")}:${String((timeToMinutes(startTime) + durationMinutes) % 60).padStart(2, "0")}`
    : null;
  try {
    const { data: existingBlocks, error: blocksError } = await db.from("schedule_blocks")
      .select("start_time,end_time")
      .eq("blocked_date", selectedDate);
    if (blocksError) {
      showToast(`Não foi possível verificar os bloqueios existentes: ${blocksError.message}`);
      return;
    }
    if (scheduleBlockConflicts(startTime, durationMinutes, existingBlocks)) {
      showToast("Esse dia ou horário já está bloqueado. Libere o bloqueio existente ou escolha outro período.");
      await refreshDashboard();
      return;
    }

    const { error } = await db.from("schedule_blocks").insert({
      blocked_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
    });
    if (error) {
      showToast(`Não foi possível bloquear esse período: ${error.message}`);
      return;
    }
    showToast(startTime ? `Horário bloqueado por ${formatDuration(durationMinutes)}.` : "Dia bloqueado.");
    await refreshDashboard();
  } finally {
    updateScheduleControls(monthBlocks.filter((block) => block.blocked_date === selectedDate));
  }
}

function timeToMinutes(value) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

async function saveServiceDurations(button) {
  if (!db) return;
  const rows = services.map((service) => {
    const input = [...document.querySelectorAll("[data-duration-service]")]
      .find((element) => element.dataset.durationService === service);
    return { service, duration_minutes: Number(input.value) };
  });
  if (rows.some(({ duration_minutes }) =>
    !Number.isInteger(duration_minutes) || duration_minutes < 30 ||
    duration_minutes > 480 || duration_minutes % 30 !== 0
  )) {
    showToast("Use durações entre 30 minutos e 8 horas, em intervalos de 30 minutos.");
    return;
  }
  button.disabled = true;
  const { error } = await db.from("service_durations").upsert(rows, { onConflict: "service" });
  button.disabled = false;
  if (error) {
    showToast(`Não foi possível salvar as durações: ${error.message}`);
    return;
  }
  showToast("Durações dos serviços salvas.");
}

async function removeScheduleBlock(id) {
  const { error } = await db.from("schedule_blocks").delete().eq("id", id);
  if (error) {
    showToast(`Não foi possível liberar o horário: ${error.message}`);
    return;
  }
  showToast("Horário liberado.");
  await refreshDashboard();
}

function statusLabel(status) {
  return {
    pending: "Aguardando confirmação",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
  }[status] || "Status desconhecido";
}

function renderCalendar() {
  calendarGrid.replaceChildren();
  for (const day of dayNames) appendBookingField(calendarGrid, "span", "calendar-cell weekday", day);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const today = dateToISO(new Date());
  document.querySelector("#calendar-month").textContent = monthNames.format(visibleMonth);
  const bookingsByDate = new Map();
  for (const booking of monthBookings) {
    const group = bookingsByDate.get(booking.booking_date) || [];
    group.push(booking);
    bookingsByDate.set(booking.booking_date, group);
  }
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const iso = dateToISO(date);
    const dayBookings = bookingsByDate.get(iso) || [];
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";
    if (date.getMonth() !== month) cell.classList.add("outside");
    if (iso === today) cell.classList.add("today");
    if (iso === selectedDate) cell.classList.add("selected");
    cell.setAttribute("aria-label", `${formatDateTitle(iso)}${dayBookings.length ? `, ${dayBookings.length} agendamentos` : ""}`);
    appendBookingField(cell, "span", "calendar-date", String(date.getDate()));
    if (dayBookings.length) {
      const pending = dayBookings.some((booking) => booking.status === "pending");
      appendBookingField(cell, "span", `calendar-dot${pending ? " pending" : ""}`, "");
      if (dayBookings.length > 1) appendBookingField(cell, "span", "calendar-booking-count", `${dayBookings.length} horários`);
    }
    cell.addEventListener("click", () => {
      selectedDate = iso;
      if (date.getMonth() !== visibleMonth.getMonth()) {
        visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        refreshDashboard();
        return;
      }
      renderCalendar();
      renderBookingList();
    });
    calendarGrid.append(cell);
  }
}

async function updateBookingStatus(id, status, select) {
  select.disabled = true;
  const { error } = await db.from("bookings").update({ status }).eq("id", id);
  select.disabled = false;
  if (error) {
    showToast(`Não foi possível atualizar o agendamento: ${error.message}`);
    await refreshDashboard();
    return;
  }
  showToast("Status do agendamento atualizado.");
  await refreshDashboard();
}

async function refreshDashboard() {
  const start = dateToISO(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
  const end = dateToISO(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0));
  const today = dateToISO(new Date());
  const weekEnd = dateToISO(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000));
  const activeUntil = dateToISO(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const [calendarResult, activeResult, blocksResult, durationsResult] = await Promise.all([
    db.from("bookings")
    .select(bookingFields)
    .gte("booking_date", start)
    .lte("booking_date", end)
    .order("booking_date")
    .order("booking_time"),
    db.from("bookings")
      .select("booking_date,status")
      .gte("booking_date", today)
      .lte("booking_date", activeUntil),
    db.from("schedule_blocks")
      .select("id,blocked_date,start_time,end_time")
      .gte("blocked_date", start)
      .lte("blocked_date", end),
    db.from("service_durations").select("service,duration_minutes"),
  ]);
  if (calendarResult.error || activeResult.error || blocksResult.error || durationsResult.error) {
    showToast(`Não foi possível carregar a agenda: ${(calendarResult.error || activeResult.error || blocksResult.error || durationsResult.error).message}`);
    return;
  }
  monthBookings = calendarResult.data;
  monthBlocks = blocksResult.data;
  for (const duration of durationsResult.data) {
    const input = [...document.querySelectorAll("[data-duration-service]")]
      .find((element) => element.dataset.durationService === duration.service);
    if (input) input.value = String(duration.duration_minutes);
  }
  const activeBookings = activeResult.data.filter((booking) => booking.status !== "cancelled");
  document.querySelector("#today-count").textContent =
    activeBookings.filter((booking) => booking.booking_date === today).length;
  document.querySelector("#pending-count").textContent =
    activeBookings.filter((booking) => booking.status === "pending").length;
  document.querySelector("#week-count").textContent =
    activeBookings.filter((booking) => booking.booking_date <= weekEnd).length;
  renderCalendar();
  renderBookingList();
}

function showAdmin() {
  adminOverlay.hidden = false;
  document.querySelector("#main-nav")?.classList.remove("open");
  document.querySelector("#menu-toggle")?.setAttribute("aria-expanded", "false");
  if (!db) {
    loginFeedback.textContent = "Configure a conexão segura com a agenda antes de acessar o painel.";
    return;
  }
  db.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      setFeedback(loginFeedback, `Não foi possível verificar sua sessão: ${error.message}`);
      return;
    }
    if (session) authorizeAdmin(session);
  });
}

async function authorizeAdmin(session) {
  if (!session?.user) return;
  loginFeedback.textContent = "Verificando acesso...";
  const { data, error } = await db.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (error || !data) {
    if (error) {
      setFeedback(loginFeedback, `Não foi possível verificar a permissão: ${error.message}`);
    } else {
      setFeedback(loginFeedback, "Esta conta não tem acesso ao painel da DMM Montagens.");
    }
    await db.auth.signOut();
    return;
  }
  loginSection.hidden = true;
  dashboard.hidden = false;
  loginFeedback.textContent = "";
  await refreshDashboard();
}

async function handleLogin(event) {
  event.preventDefault();
  if (!db) {
    setFeedback(loginFeedback, "O painel ainda não está configurado. Consulte as instruções de instalação do projeto.");
    return;
  }
  const button = loginForm.querySelector('[type="submit"]');
  button.disabled = true;
  setFeedback(loginFeedback, "");
  const values = new FormData(loginForm);
  const { data, error } = await db.auth.signInWithPassword({
    email: values.get("email"),
    password: values.get("password"),
  });
  button.disabled = false;
  if (error) {
    setFeedback(loginFeedback, "Não foi possível entrar. Confira o e-mail e a senha.");
    return;
  }
  await authorizeAdmin(data.session);
}

async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) {
    showToast(`Não foi possível sair: ${error.message}`);
    return;
  }
  dashboard.hidden = true;
  loginSection.hidden = false;
  loginForm.reset();
  setFeedback(loginFeedback, "Sessão encerrada.");
}

function refreshSelectedMonth(offset) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
  refreshDashboard();
}

function routeToAdmin() {
  const isAdmin = window.location.hash === "#admin" ||
    window.location.pathname.replace(/\/index\.html$/i, "").replace(/\/+$/, "").endsWith("/gestao");
  adminOverlay.hidden = !isAdmin;
  if (isAdmin) showAdmin();
  else {
    loginSection.hidden = false;
    dashboard.hidden = true;
  }
}

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
document.querySelector("#menu-toggle")?.addEventListener("click", (event) => {
  const menu = document.querySelector("#main-nav");
  if (!menu) return;
  const isOpen = menu.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
});
document.querySelector("#main-nav")?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    document.querySelector("#main-nav").classList.remove("open");
    document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
  }
});
if (form && bookingDate) {
  form.addEventListener("submit", submitBooking);
  bookingDate.min = dateToISO(new Date());
  bookingDate.addEventListener("change", () => {
    setFeedback(feedback, "");
    if (!bookingDate.value || !db) return;
    void loadAvailableSlots(bookingDate.value, bookingService.value);
  });
  bookingService.addEventListener("change", () => {
    if (!bookingDate.value || !db) {
      bookingTime.disabled = true;
      bookingTime.innerHTML = '<option value="">Escolha uma data primeiro</option>';
      return;
    }
    void loadAvailableSlots(bookingDate.value, bookingService.value);
  });
}
loginForm.addEventListener("submit", handleLogin);
document.querySelector("#signout-button").addEventListener("click", signOut);
document.querySelector("#previous-month").addEventListener("click", () => refreshSelectedMonth(-1));
document.querySelector("#next-month").addEventListener("click", () => refreshSelectedMonth(1));
document.querySelector("#today-button").addEventListener("click", () => {
  visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedDate = dateToISO(new Date());
  void refreshDashboard();
});
document.querySelector("#export-week-button")?.addEventListener("click", (event) => {
  void exportConfirmedWeek(event.currentTarget);
});
document.querySelector("#block-day-button")?.addEventListener("click", () => void addScheduleBlock());
document.querySelector("#block-time")?.addEventListener("change", () => {
  updateScheduleControls(monthBlocks.filter((block) => block.blocked_date === selectedDate));
});
document.querySelector("#block-duration")?.addEventListener("change", () => {
  updateScheduleControls(monthBlocks.filter((block) => block.blocked_date === selectedDate));
});
document.querySelector("#block-time-button")?.addEventListener("click", () => {
  const select = document.querySelector("#block-time");
  if (!select.value) {
    showToast("Escolha um horário para bloquear.");
    return;
  }
  void addScheduleBlock(select.value, Number(document.querySelector("#block-duration").value));
});
document.querySelector("#save-durations-button")?.addEventListener("click", (event) => {
  void saveServiceDurations(event.currentTarget);
});
setupContactLinks();
setupHeroCarousel();
setBookingAvailability(supabaseReady);
window.addEventListener("hashchange", routeToAdmin);
routeToAdmin();
