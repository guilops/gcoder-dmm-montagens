import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const slots = ["08:00", "09:30", "11:00", "13:30", "15:00", "16:30"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  let body: { date?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Envie uma data válida para consultar a agenda." }, 400);
  }

  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return jsonResponse({ error: "Escolha uma data válida para consultar a agenda." }, 400);
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
  if (date.getUTCDay() === 0) {
    return jsonResponse({ availableSlots: [] });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("Booking availability is missing its server-side Supabase configuration.");
    return jsonResponse({ error: "A agenda está temporariamente indisponível." }, 503);
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.from("bookings")
    .select("booking_time")
    .eq("booking_date", body.date)
    .in("status", ["pending", "confirmed"]);
  if (error) {
    console.error("Failed to retrieve occupied booking slots:", error.message);
    return jsonResponse({ error: "Não foi possível consultar a agenda agora." }, 500);
  }

  const occupied = new Set(data.map((booking) => booking.booking_time));
  if (body.date === dateToSaoPauloISO()) {
    const timeParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const currentTime = `${timeParts.find((part) => part.type === "hour")?.value}:${timeParts.find((part) => part.type === "minute")?.value}`;
    for (const slot of slots) {
      if (slot <= currentTime) occupied.add(slot);
    }
  }

  return jsonResponse({ availableSlots: slots.filter((slot) => !occupied.has(slot)) });
});

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
