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
    caption: "Montagem de móvel com ferramentas e manual",
    image: "https://images.pexels.com/photos/5805491/pexels-photo-5805491.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/tools-and-paper-instruction-for-furniture-assembly-5805491/",
  },
  {
    caption: "Montagem de mesa com chave de fenda",
    image: "https://images.pexels.com/photos/4554427/pexels-photo-4554427.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/woman-in-white-long-sleeve-shirt-sitting-on-chair-4554427/",
  },
  {
    caption: "Ajuste de peças com chave Allen",
    image: "https://images.pexels.com/photos/5217124/pexels-photo-5217124.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/unrecognizable-man-hands-assembling-baby-cot-5217124/",
  },
  {
    caption: "Montagem de móvel em uma casa nova",
    image: "https://images.pexels.com/photos/4554417/pexels-photo-4554417.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/person-in-gray-long-sleeve-shirt-holding-black-smartphone-4554417/",
  },
  {
    caption: "Montagem de mesa em casa",
    image: "https://images.pexels.com/photos/4554421/pexels-photo-4554421.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/woman-in-white-crew-neck-t-shirt-holding-red-and-white-plastic-toy-4554421/",
  },
  {
    caption: "Montagem de mesa durante a mudança",
    image: "https://images.pexels.com/photos/4554420/pexels-photo-4554420.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/man-in-gray-hoodie-using-black-tablet-computer-4554420/",
  },
  {
    caption: "Montagem de banco de madeira",
    image: "https://images.pexels.com/photos/31755424/pexels-photo-31755424.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/close-up-of-hands-assembling-wooden-furniture-31755424/",
  },
  {
    caption: "Montagem de mesa de centro",
    image: "https://images.pexels.com/photos/4554425/pexels-photo-4554425.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/woman-in-white-long-sleeve-shirt-and-black-pants-sitting-on-floor-4554425/",
  },
  {
    caption: "Montagem de mesa em uma casa nova",
    image: "https://images.pexels.com/photos/4554429/pexels-photo-4554429.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/woman-in-white-long-sleeve-shirt-sitting-on-gray-couch-4554429/",
  },
  {
    caption: "Montagem de berço com ferramentas",
    image: "https://images.pexels.com/photos/7491417/pexels-photo-7491417.jpeg?auto=compress&cs=tinysrgb&w=1200",
    source: "https://www.pexels.com/photo/a-man-setting-up-the-crib-7491417/",
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
    setFeedback(feedback, "Não foi possível consultar a agenda agora. Tente novamente em instantes ou fale pelo WhatsApp.");
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

async function addScheduleBlock(startTime = null, durationMinutes = 90) {
  if (!db) return;
  if (startTime && timeToMinutes(startTime) + durationMinutes > 18 * 60) {
    showToast("O bloqueio precisa terminar até 18h. Escolha um período menor.");
    return;
  }
  const endTime = startTime
    ? `${String(Math.floor((timeToMinutes(startTime) + durationMinutes) / 60)).padStart(2, "0")}:${String((timeToMinutes(startTime) + durationMinutes) % 60).padStart(2, "0")}`
    : null;
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
document.querySelector("#block-day-button")?.addEventListener("click", () => void addScheduleBlock());
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
