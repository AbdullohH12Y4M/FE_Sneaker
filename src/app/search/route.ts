import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Use /search/page for catalog UI, and /search/api/product/filtered for filtered API.' });
}

