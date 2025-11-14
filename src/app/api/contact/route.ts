import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!email || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // TODO: send email with Resend, SES, SMTP, etc.
    console.log('New contact message:', { name, email, message });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
