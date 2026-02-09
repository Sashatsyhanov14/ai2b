import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabaseClient'

// Try importing parse libraries dynamically or assume they exist
// Since this is server-side, we can use these if installed

export async function POST(req: Request) {
    try {
        const { id } = await req.json()
        if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

        const sb = getServerClient()
        const { data: file, error } = await sb.from('company_files').select('*').eq('id', id).single()

        if (error || !file) {
            return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 })
        }

        const { url, file_type, name } = file

        // Fetch file content
        const res = await fetch(url)
        if (!res.ok) {
            return NextResponse.json({ ok: false, error: 'Failed to download file' }, { status: 400 })
        }
        const arrayBuffer = await res.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        let textForIndex = ''

        if (file_type === 'document') {
            // Determine format by extension or generic
            const lowerName = name.toLowerCase()
            if (lowerName.endsWith('.pdf')) {
                try {
                    const pdf = require('pdf-parse')
                    const data = await pdf(buffer)
                    textForIndex = data.text
                } catch (e: any) {
                    console.error('PDF Parse error:', e)
                    textForIndex = `[PDF Parsing Failed: ${e.message}]`
                }
            } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
                try {
                    const mammoth = require('mammoth')
                    const result = await mammoth.extractRawText({ buffer })
                    textForIndex = result.value
                } catch (e: any) {
                    console.error('Docx Parse error:', e)
                    textForIndex = `[Docx Parsing Failed: ${e.message}]`
                }
            } else {
                // Assume text/markdown
                textForIndex = buffer.toString('utf-8')
            }
        } else {
            // Image/Video - no text extraction for now
            // Maybe description is enough
            textForIndex = file.description || ''
        }

        // Fallback if empty and not image
        if (!textForIndex.trim()) {
            textForIndex = file.description || ''
        }

        // Update DB
        const { error: updateError } = await sb.from('company_files').update({ content_text: textForIndex }).eq('id', id)

        if (updateError) {
            // If column missing, it might fail. Retrying without it is pointless as goal is to save it.
            // We'll return error so user knows to run migration.
            return NextResponse.json({ ok: false, error: 'DB Update Failed: ' + updateError.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true, textLength: textForIndex.length })

    } catch (e: any) {
        console.error('Process error:', e)
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}
