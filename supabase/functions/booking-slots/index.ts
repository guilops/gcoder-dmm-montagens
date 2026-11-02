import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const allowedServices = new Set([
  "Móveis em geral",
  "Armários e cozinhas planejadas",
  "Desmontagem e remontagem",
  "Outro — vou explicar nos detalhes",
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  let body: { date?: unknown; service?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Envie uma data válida para consultar a agenda." }, 400);
  }

  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return jsonResponse({ error: "Escolha uma data válida para consultar a agenda." }, 400);
  }
  if (typeof body.service !== "string" || !allowedServices.has(body.service)) {
    return jsonResponse({ error: "Escolha um serviço para consultar os horários." }, 400);
  }

  const date = new Date(`${body.date}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== body.date) {
    return jsonResponse({ error: "A data informada não é válida." }, 400);
  }
  const localToday = new Date(`${dateToSaoPauloISO()}T00:00:00Z`);
  const lastDay = new Date(localToday);
  lastDay.setUTCDate(lastDay.getUTCDate() + 90);
  if (date < localToday || date > lastDay) {
    return jsonResponse({ error: "Escolha uma data entre hoje e os próximos 90 dias." }, 400);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("Booking availability is missing its server-side Supabase configuration.");
    return jsonResponse({ error: "A agenda está temporariamente indisponível." }, 503);
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data: serviceDuration, error: durationError } = await client.from("service_durations")
    .select("duration_minutes")
    .eq("service", body.service)
    .single();
  if (durationError || !serviceDuration) {
    console.error("Failed to retrieve service duration:", durationError?.message || "No duration was returned.");
    return jsonResponse({ error: "Não foi possível consultar a duração do serviço." }, 500);
  }
  const durationMinutes = serviceDuration.duration_minutes;
  if (date.getUTCDay() === 0) {
    return jsonResponse({ availableSlots: [], durationMinutes });
  }

  const { data, error } = await client.from("bookings")
    .select("booking_time,duration_minutes")
    .eq("booking_date", body.date)
    .in("status", ["pending", "confirmed"]);
  if (error) {
    console.error("Failed to retrieve occupied booking slots:", error.message);
    return jsonResponse({ error: "Não foi possível consultar a agenda agora." }, 500);
  }

  const { data: blocks, error: blocksError } = await client.from("schedule_blocks")
    .select("start_time,end_time")
    .eq("blocked_date", body.date);
  if (blocksError) {
    console.error("Failed to retrieve schedule blocks:", blocksError.message);
    return jsonResponse({ error: "Não foi possível consultar a agenda agora." }, 500);
  }
  if (blocks.some((block) => block.start_time === null)) {
    return jsonResponse({ availableSlots: [] });
  }

  const blocked = blocks.map((block) => ({
    start: String(block.start_time).slice(0, 5),
    end: String(block.end_time).slice(0, 5),
  }));
  const occupied = data.map((booking) => ({
    start: timeToMinutes(booking.booking_time),
    end: timeToMinutes(booking.booking_time) + booking.duration_minutes,
  }));
  const slots = [];
  for (let start = 8 * 60; start <= 16 * 60 + 30; start += 30) {
    if (start + durationMinutes <= 18 * 60) slots.push(start);
  }
  if (body.date === dateToSaoPauloISO()) {
    const timeParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const currentTime = `${timeParts.find((part) => part.type === "hour")?.value}:${timeParts.find((part) => part.type === "minute")?.value}`;
    occupied.push({ start: 0, end: timeToMinutes(currentTime) + 1 });
  }

  const availableSlots = slots
    .filter((start) => !occupied.some((period) =>
      start < period.end && start + durationMinutes > period.start
    ))
    .filter((start) => !blocked.some((period) =>
      start < timeToMinutes(period.end) &&
      start + durationMinutes > timeToMinutes(period.start)
    ))
    .map(minutesToTime);
  return jsonResponse({ availableSlots, durationMinutes });
});

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function dateToSaoPauloISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
