import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type DeleteAccountPayload = {
  confirmationEmail?: string
}

async function listAllFiles(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
) {
  const files: string[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      throw error
    }

    const batch = (data ?? [])
      .filter((item) => item.name)
      .map((item) => `${prefix}/${item.name}`)

    files.push(...batch)

    if ((data?.length ?? 0) < limit) {
      break
    }

    offset += limit
  }

  return files
}

async function removeUserFiles(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const bucketNames = ['avatars', 'photos', 'verification']

  for (const bucket of bucketNames) {
    const files = await listAllFiles(supabase, bucket, userId)
    if (!files.length) continue

    const { error } = await supabase.storage.from(bucket).remove(files)
    if (error) {
      throw error
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !authHeader) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: DeleteAccountPayload = {}
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const normalizedConfirmation = payload.confirmationEmail?.trim().toLowerCase()
  const normalizedUserEmail = user.email?.trim().toLowerCase()

  if (!normalizedConfirmation || !normalizedUserEmail || normalizedConfirmation !== normalizedUserEmail) {
    return new Response(JSON.stringify({ error: 'Confirmation email mismatch' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    await removeUserFiles(adminClient, user.id)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      throw deleteError
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('delete-account failed', error)
    const message = error instanceof Error ? error.message : 'Delete account failed'

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
