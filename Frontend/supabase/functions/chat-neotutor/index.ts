import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message, history } = await req.json()
    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAiKey) {
      throw new Error('OpenAI API Key not configured')
    }

    // Siapkan pesan untuk OpenAI
    // Kita berikan instruksi sistem agar AI bertingkah seperti Tutor
    const systemMessage = {
      role: 'system',
      content: 'Anda adalah NeoTutor, asisten pendidikan AI yang ramah, sabar, dan inklusif. Jelaskan konsep dengan bahasa sederhana, gunakan analogi, dan dorong siswa untuk berpikir kritis. Jangan langsung memberikan jawaban PR mentah-mentah, tapi bimbing mereka.'
    }

    // Format history chat agar AI ingat konteks
    const messages = [
        systemMessage,
        ...history.slice(-5).map((msg: any) => ({ // Ambil 5 chat terakhir saja untuk hemat token
            role: msg.role,
            content: msg.content
        })),
        { role: 'user', content: message }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // atau gpt-3.5-turbo (lebih murah)
        messages: messages,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const reply = data.choices[0].message.content

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})