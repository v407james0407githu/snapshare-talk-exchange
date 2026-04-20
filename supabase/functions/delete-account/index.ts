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
  const authHeader = req.headers.get('Authorization')

  if (!supabaseUrl || !serviceRoleKey || !authHeader) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken)

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
    const { data: profile } = await adminClient
      .from('profiles')
      .select('username, display_name, created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const { error: logError } = await adminClient
      .from('deleted_account_logs')
      .insert({
        deleted_user_id: user.id,
        email: normalizedUserEmail,
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
        profile_created_at: profile?.created_at ?? null,
        deletion_source: 'self-service',
        metadata: {
          provider_count: user.identities?.length ?? 0,
        },
      })

    if (logError) {
      throw logError
    }

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
