import { NextResponse } from 'next/server'

const HEADER = 'x-admin-key'

export function requireAdminKey(req: Request) {
  const configured = process.env.ADMIN_MUTATION_KEY?.trim()
  if (!configured) {
    return NextResponse.json(
      { error: 'ADMIN_MUTATION_KEY is not configured' },
      { status: 500 }
    )
  }

  const provided = req.headers.get(HEADER)?.trim()
  if (!provided || provided !== configured) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}

export const ADMIN_MUTATION_HEADER = HEADER
