import { NextRequest, NextResponse } from 'next/server';
import { AdvancedTypographyProcessor } from '@/lib/typography';
import mammoth from 'mammoth';
import PizZip from 'pizzip';

export async function POST(request: NextRequest) {
  try {
    console.log('=== НАЧАЛО ОБРАБОТКИ ФАЙЛА ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('ОШИБКА: Файл не найден в запросе');
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    console.log(`ФАЙЛ: ${file.name}, РАЗМЕР: ${file.size} байт, ТИП: ${file.type}`);

    // Проверка размера файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('ОШИБКА: Файл слишком большой');
      return NextResponse.json({ error: 'Файл слишком большой (максимум 10MB)' }, { status: 400 });
    }

    let text = '';

    try {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.docx')) {
        console.log('ОБРАБОТКА: Word документ');
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = new PizZip(buffer);
          // Обработка основного текста
          let documentXml = zip.file('word/document.xml')?.asText();
          if (!documentXml) throw new Error('document.xml не найден');
          documentXml = processDocxXml(documentXml);
          // ВАЛИДАЦИЯ: запрещаем неэкранированные &, <, > вне тегов
          const plainText = documentXml.replace(/<[^>]+>/g, '');
          if (/[&<>]/.test(plainText)) {
            const badFragment = plainText.match(/.{0,30}[&<>].{0,30}/g);
            console.error('ОШИБКА: document.xml содержит неэкранированные спецсимволы! Фрагменты:', badFragment);
            return new Response('Ошибка: document.xml содержит неэкранированные спецсимволы!', { status: 500 });
          }
          console.log('DEBUG: document.xml после обработки:', documentXml.slice(0, 2000));
          zip.file('word/document.xml', documentXml);
          // Обработка сносок, если есть
          if (zip.file('word/footnotes.xml')) {
            let footnotesXml = zip.file('word/footnotes.xml')?.asText();
            if (footnotesXml) {
              footnotesXml = processDocxXml(footnotesXml);
              console.log('DEBUG: footnotes.xml после обработки:', footnotesXml.slice(0, 1000));
              zip.file('word/footnotes.xml', footnotesXml);
            }
          }
          const outBuffer = zip.generate({ type: 'nodebuffer' });
          const originalName = file.name.replace(/\.docx$/i, '');
          let fileNameTranslit = transliterate(originalName);
          fileNameTranslit = fileNameTranslit.replace(/[^A-Za-z0-9_-]/g, '_').replace(/[_-]+$/, '');
          const asciiFileName = fileNameTranslit;
          const utf8FileName = `${fileNameTranslit}.docx`;
          console.log('УСПЕХ: Создан выходной файл:', utf8FileName);
          return new Response(outBuffer, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'Content-Disposition': `attachment; filename="${asciiFileName}.docx"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`,
              'Content-Length': outBuffer.length.toString(),
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        } catch (wordError) {
          console.error('ОШИБКА Word:', wordError);
          throw new Error(`Ошибка обработки Word документа: ${wordError instanceof Error ? wordError.message : 'Неизвестная ошибка'}`);
        }
      } else {
        console.error('ОШИБКА: Неподдерживаемый формат файла');
        return NextResponse.json({ 
          error: `Неподдерживаемый формат файла: ${file.name}. Поддерживаются только .docx` 
        }, { status: 400 });
      }

    } catch (extractError) {
      console.error('ОШИБКА ИЗВЛЕЧЕНИЯ:', extractError);
      return NextResponse.json({ 
        error: `Ошибка чтения файла: ${extractError instanceof Error ? extractError.message : 'Неизвестная ошибка'}` 
      }, { status: 500 });
    }

    // Проверяем результат
    if (!text || text.trim().length === 0) {
      console.error('ОШИБКА: Пустой текст после извлечения');
      return NextResponse.json({ 
        error: 'Файл пуст или не содержит читаемого текста' 
      }, { status: 400 });
    }

    console.log('ОБРАБОТКА: Применение типографских правил');
    
    try {
      // Применяем типографские правила
      const processedText = AdvancedTypographyProcessor.process(text);
      const stats = AdvancedTypographyProcessor.getProcessingStats(text, processedText);
      
      console.log('УСПЕХ: Типографские правила применены');
      console.log('СТАТИСТИКА:', JSON.stringify(stats));

      // Создаем файл для скачивания
      const textWithBOM = '\uFEFF' + processedText;
      const outputBuffer = Buffer.from(textWithBOM, 'utf-8');
      
      const originalName = file.name.replace(/\.(docx?|txt)$/i, '');
      let fileNameTranslit = transliterate(originalName);
      fileNameTranslit = fileNameTranslit.replace(/[^A-Za-z0-9_-]/g, '_').replace(/[_-]+$/, '');
      const asciiFileName = fileNameTranslit;
      const utf8FileName = `${fileNameTranslit}_obrabotano.txt`;
      
      console.log('УСПЕХ: Создан выходной файл:', utf8FileName);
      
      return new Response(outputBuffer, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${asciiFileName}_obrabotano.txt"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`,
          'Content-Length': outputBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Typography-Stats': JSON.stringify(stats),
        },
      });

    } catch (processingError: unknown) {
      console.error('ОШИБКА ОБРАБОТКИ:', processingError);
      return NextResponse.json({ 
        error: `Ошибка типографской обработки: ${
          processingError instanceof Error
            ? processingError.message
            : typeof processingError === 'string'
              ? processingError
              : 'Неизвестная ошибка'
        }` 
      }, { status: 500 });
    }

  } catch (generalError) {
    console.error('ОБЩАЯ ОШИБКА:', generalError);
    return NextResponse.json({
      error: `Внутренняя ошибка сервера: ${generalError instanceof Error ? generalError.message : 'Неизвестная ошибка'}`
    }, { status: 500 });
  }
}

/**
 * Безопасная конвертация HTML в текст
 */
function convertHtmlToText(html: string): string {
  try {
    let text = html;
    
    // Заменяем HTML теги на переносы строк и символы
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<\/li>/gi, '\n');
    
    // Убираем HTML теги, но сохраняем содержимое
    text = text.replace(/<[^>]*>/g, '');
    
    // Декодируем HTML сущности
    const entities = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&rsquo;': "'",
      '&lsquo;': "'",
      '&rdquo;': '"',
      '&ldquo;': '"',
      '&mdash;': '—',
      '&ndash;': '–',
      '&hellip;': '…',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™'
    };
    
    for (const [entity, replacement] of Object.entries(entities)) {
      text = text.replace(new RegExp(entity, 'g'), replacement);
    }
    
    // Убираем лишние пробелы и переносы
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]{2,}/g, ' ');
    
    return text.trim();
    
  } catch (error) {
    console.error('Ошибка конвертации HTML:', error);
    return html; // Возвращаем исходный HTML в случае ошибки
  }
}

// Функция транслитерации кириллицы в латиницу
function transliterate(str: string): string {
  const map: Record<string, string> = {
    А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Zh', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    ' ': '_', '—': '-', '–': '-', ',': '', '.': '', '«': '', '»': '', '(': '', ')': '', '[': '', ']': '', '{': '', '}': '', '/': '-', '\\': '-', '@': 'at', '#': '', '$': '', '%': '', '^': '', '&': '', '*': '', '+': '', '=': '', ':': '', ';': '', '?': '', '!': '', '"': '', '\'': '', '<': '', '>': '', '|': '', '`': '', '~': ''
  };
  return str.split('').map(char => map[char] !== undefined ? map[char] : char).join('');
}

// Функция экранирования спецсимволов XML
function escapeXml(unsafe: string): string {
  // Сначала декодируем уже экранированные сущности (если есть)
  let text = unsafe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  // Затем экранируем заново
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

// Вспомогательная функция: обработка XML Word (document.xml, footnotes.xml)
function processDocxXml(xml: string): string {
  // Заменяем только содержимое <w:t>...</w:t>
  return xml.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g, (match, open, text, close) => {
    // Если внутри <w:t> есть XML-теги — не трогаем этот узел
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return match;
    }
    const processed = escapeXml(AdvancedTypographyProcessor.process(text));
    return open + processed + close;
  });
}