import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const availableSlots = new Set(["08:00", "09:30", "11:00", "13:30", "15:00", "16:30"]);
const allowedServices = new Set([
  "Móveis residenciais",
  "Cozinhas e armários",
  "Escritório e comércio",
  "Desmontagem e ajuste",
  "Outro — vou explicar nos detalhes",
]);

type BookingRequest = {
  customer_name?: unknown;
  customer_phone?: unknown;
  customer_email?: unknown;
  service?: unknown;
  details?: unknown;
  booking_date?: unknown;
  booking_time?: unknown;
  website?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  let body: BookingRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Não foi possível ler o pedido de agendamento." }, 400);
  }

  if (body.website) return jsonResponse({ error: "Não foi possível validar o pedido." }, 400);
  const name = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  const phone = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
  const email = typeof body.customer_email === "string" ? body.customer_email.trim() : "";
  const service = typeof body.service === "string" ? body.service.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  const date = typeof body.booking_date === "string" ? body.booking_date : "";
  const time = typeof body.booking_time === "string" ? body.booking_time : "";
  if (
    name.length < 2 || name.length > 100 ||
    phone.replace(/\D/g, "").length < 10 || phone.length > 30 ||
    email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !allowedServices.has(service) || details.length > 1200 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) || !availableSlots.has(time)
  ) {
    return jsonResponse({ error: "Confira os dados e o horário escolhido e tente novamente." }, 400);
  }

  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return jsonResponse({ error: "Escolha uma data válida." }, 400);
  }
  const { localToday, lastDay } = brazilDateRange();
  const utcDay = new Date(`${date}T12:00:00Z`);
  if (utcDay < localToday || utcDay > lastDay || utcDay.getUTCDay() === 0) {
    return jsonResponse({ error: "Escolha uma data disponível nos próximos 90 dias." }, 400);
  }
  if (date === brazilToday() && time <= brazilCurrentTime()) {
    return jsonResponse({ error: "Esse horário já passou. Escolha um horário futuro." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  const emailFrom = Deno.env.get("EMAIL_FROM");
  if (!supabaseUrl || !serviceKey || !resendKey || !adminEmail || !emailFrom) {
    console.error("Booking submission is missing its server-side Supabase or email configuration.");
    return jsonResponse({ error: "Não foi possível enviar o pedido agora. Tente pelo WhatsApp." }, 503);
  }

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: booking, error: insertError } = await client.from("bookings").insert({
    customer_name: name,
    customer_phone: phone,
    customer_email: email,
    service,
    details,
    booking_date: date,
    booking_time: time,
  }).select("id").single();

  if (insertError?.code === "23505") {
    return jsonResponse({
      code: "slot_taken",
      error: "Esse horário acabou de ser reservado. Escolha outro horário.",
    }, 409);
  }
  if (insertError || !booking) {
    console.error("Failed to save the booking:", insertError?.message || "No booking was returned.");
    return jsonResponse({ error: "Não foi possível salvar o pedido. Tente novamente." }, 500);
  }

  const safeName = escapeHtml(name);
  const safePhone = escapeHtml(phone);
  const safeService = escapeHtml(service);
  const safeDetails = escapeHtml(details || "Nenhum detalhe informado");
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(utcDay);
  const whatsapp = phone.replace(/\D/g, "");
  const adminMessage = {
    from: emailFrom,
    to: [adminEmail],
    subject: `Novo pedido de montagem — ${name}`,
    html: `<h2>Novo pedido de agendamento — DMM Montagens</h2><p><strong>Cliente:</strong> ${safeName}</p><p><strong>Telefone:</strong> ${safePhone} (<a href="https://wa.me/${whatsapp}">conversar no WhatsApp</a>)</p><p><strong>E-mail:</strong> ${escapeHtml(email)}</p><p><strong>Serviço:</strong> ${safeService}</p><p><strong>Data:</strong> ${dateLabel} às ${time}</p><p><strong>Detalhes:</strong> ${safeDetails}</p><p>Acesse o painel da DMM Montagens para confirmar ou ajustar este pedido.</p>`,
  };
  const customerMessage = {
    from: emailFrom,
    to: [email],
    subject: "Recebemos seu pedido — DMM Montagens",
    html: `<p>Olá, ${safeName}!</p><p>Seu pedido de <strong>${safeService}</strong> para <strong>${dateLabel} às ${time}</strong> foi recebido. O horário ainda depende da confirmação da DMM Montagens.</p><p>Seus detalhes: ${safeDetails}</p><p>A DMM Montagens vai entrar em contato pelo WhatsApp ${safePhone} para combinar o orçamento e confirmar o atendimento.</p><p>Obrigado,<br>DMM Montagens</p>`,
  };

  const deliveryResults = await Promise.all([adminMessage, customerMessage].map(async (message) => {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        console.error(`Resend could not send a booking notification (${response.status}):`, await response.text());
        return false;
      }
      return true;
    } catch (error) {
      console.error("Resend request failed:", error);
      return false;
    }
  }));
  const notificationsSent = deliveryResults.every(Boolean);
  const { error: notificationUpdateError } = await client.from("bookings")
    .update({ notifications_sent: notificationsSent })
    .eq("id", booking.id);
  if (notificationUpdateError) {
    console.error("The booking was saved but its email delivery status could not be saved:", notificationUpdateError.message);
  }

  return jsonResponse({
    bookingId: booking.id,
    notificationsSent,
  }, 201);
});

function brazilToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function brazilCurrentTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function brazilDateRange() {
  const today = brazilToday();
  const localToday = new Date(`${today}T00:00:00Z`);
  const lastDay = new Date(localToday);
  lastDay.setUTCDate(lastDay.getUTCDate() + 90);
  return { localToday, lastDay };
}
