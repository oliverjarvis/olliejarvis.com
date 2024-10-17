import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

export async function GET() {
  const parser = new Parser();
  try {
    // Replace 'your-substack-url' with your actual Substack feed URL
    const feed = await parser.parseURL('https://garymarcus.substack.com/feed');
    const latestArticle = feed.items[0]; // Get the latest article
    return NextResponse.json({ latestArticle });
    return NextResponse.json({"a":"hello"});
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch Substack feed' }, { status: 500 });
  }
}
