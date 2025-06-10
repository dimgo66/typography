import { NextResponse } from 'next/server';
import { AdvancedTypographyProcessor } from '@/lib/typography';

export async function GET() {
  try {
    const demoText = AdvancedTypographyProcessor.getExampleText();
    
    // Добавляем BOM для корректной кодировки
    const textWithBOM = '\uFEFF' + demoText;
    const buffer = Buffer.from(textWithBOM, 'utf-8');
    const fileName = 'демо-типографика-с-поэзией.txt';

    return new Response(buffer, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Ошибка создания демо-файла:', error);
    return NextResponse.json(
      { error: 'Ошибка создания демо-файла' },
      { status: 500 }
    );
  }
}