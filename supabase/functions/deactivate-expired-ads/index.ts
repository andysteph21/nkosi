import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("ad")
    .update({ is_active: false })
    .eq("is_active", true)
    .not("end_date", "is", null)
    .lt("end_date", now)
    .select("id, alt_text, end_date")

  if (error) {
    console.error("Failed to deactivate expired ads:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const count = data?.length ?? 0
  console.log(`Deactivated ${count} expired ad(s).`, data)

  return new Response(JSON.stringify({ deactivated: count, ads: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
