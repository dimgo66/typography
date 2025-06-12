import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { typographText } from '@/lib/typography';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import path from 'path';
import PizZip from 'pizzip';
import { load as loadXml } from 'cheerio';

function typographHtml(html: string): string {
  const $ = cheerio.load(html);
  $('body, body *').contents().each(function () {
    if (this.type === 'text') {
      this.data = typographText(this.data || '');
    }
  });
  return $.html();
}

function transliterate(str: string): string {
  const map: Record<string, string> = {
    А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Zh', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    ' ': '_', '—': '-', '–': '-', ',': '', '.': '', '«': '', '»': '', '(': '', ')': '', '[': '', ']': '', '{': '', '}': '', '/': '-', '\\': '-', '@': 'at', '#': '', '$': '', '%': '', '^': '', '&': '', '*': '', '+': '', '=': '', ':': '', ';': '', '?': '', '!': '', '"': '', '\'': '', '<': '', '>': '', '|': '', '`': '', '~': ''
  };
  return str.split('').map(char => map[char] !== undefined ? map[char] : char).join('');
}

function parseRuns($: cheerio.CheerioAPI, $elem: cheerio.Cheerio<any>, parentStyle: any = {}): TextRun[] {
  const runs: TextRun[] = [];
  $elem.contents().each((_, node) => {
    let style = { ...parentStyle };
    if (node.type === 'tag') {
      if (node.name === 'b' || node.name === 'strong') style.bold = true;
      if (node.name === 'i' || node.name === 'em') style.italics = true;
      if (node.name === 'u') style.underline = {};
      if (node.name === 'span' && node.attribs && node.attribs.style) {
        const s = node.attribs.style;
        const colorMatch = s.match(/color:\s*([^;]+)/i);
        if (colorMatch) style.color = colorMatch[1].replace('#', '');
        const sizeMatch = s.match(/font-size:\s*(\d+)px/i);
        if (sizeMatch) style.size = Number(sizeMatch[1]) * 2;
      }
      runs.push(...parseRuns($, $(node), style));
    } else if (node.type === 'text') {
      if (node.data && node.data.trim()) {
        runs.push(new TextRun({ text: node.data, ...style }));
      }
    }
  });
  return runs;
}

function isEmptyParagraph(paragraph: any): boolean {
  // Вариант с root (docx >= 7)
  if (Array.isArray(paragraph.root) && paragraph.root.length > 1) {
    const textRun = paragraph.root[1];
    if (textRun && Array.isArray(textRun.root) && textRun.root.length > 1) {
      const textValue = textRun.root[1];
      return textValue === ' ' || textValue === '\u00A0' || textValue === '&nbsp;';
    }
  }
  // Старые варианты (на всякий случай)
  if (paragraph.children && paragraph.children.length === 1) {
    const t = paragraph.children[0];
    const text = t.text || (t.root && t.root.text);
    return text === '\u00A0' || text === '&nbsp;' || text === ' ';
  }
  if (paragraph.options?.text !== undefined) {
    return paragraph.options.text === '\u00A0' || paragraph.options.text === '&nbsp;' || paragraph.options.text === ' ';
  }
  return false;
}

function hasSignificantContent(paragraph: any): boolean {
  // Проверяем root (docx >= 7)
  if (Array.isArray(paragraph.root) && paragraph.root.length > 1) {
    const textRun = paragraph.root[1];
    if (textRun && Array.isArray(textRun.root) && textRun.root.length > 1) {
      const textValue = textRun.root[1];
      // Считаем значимым только если есть буква или цифра
      return /[A-Za-zА-Яа-яЁё0-9]/.test(textValue);
    }
  }
  // Старые варианты (на всякий случай)
  if (paragraph.children && paragraph.children.length === 1) {
    const t = paragraph.children[0];
    const text = t.text || (t.root && t.root.text);
    return /[A-Za-zА-Яа-яЁё0-9]/.test(text);
  }
  if (paragraph.options?.text !== undefined) {
    return /[A-Za-zА-Яа-яЁё0-9]/.test(paragraph.options.text);
  }
  return false;
}

function isTrulyEmptyParagraph(paragraph: any): boolean {
  // Проверяем root (docx >= 7)
  if (Array.isArray(paragraph.root) && paragraph.root.length > 1) {
    const textRun = paragraph.root[1];
    if (textRun && Array.isArray(textRun.root) && textRun.root.length > 1) {
      const textValue = textRun.root[1];
      return textValue === ' ' || textValue === '\u00A0' || textValue === '&nbsp;';
    }
  }
  // Старые варианты (на всякий случай)
  if (paragraph.children && paragraph.children.length === 1) {
    const t = paragraph.children[0];
    const text = t.text || (t.root && t.root.text);
    return text === '\u00A0' || text === '&nbsp;' || text === ' ';
  }
  if (paragraph.options?.text !== undefined) {
    return paragraph.options.text === '\u00A0' || paragraph.options.text === '&nbsp;' || paragraph.options.text === ' ';
  }
  return false;
}

function trimTrailingEmptyParagraphs(paragraphs: any[]): any[] {
  let lastNonEmpty = paragraphs.length - 1;
  for (; lastNonEmpty >= 0; lastNonEmpty--) {
    if (!isTrulyEmptyParagraph(paragraphs[lastNonEmpty])) {
      break;
    }
  }
  return paragraphs.slice(0, lastNonEmpty + 1);
}

function htmlToDocxParagraphs(html: string): Paragraph[] {
  const $ = cheerio.load(html);
  const paragraphs: Paragraph[] = [];
  let prevWasBlock = false;
  $('body').contents().each((_, elem) => {
    if (elem.type === 'tag') {
      if (elem.tagName === 'p' || elem.tagName === 'div') {
        const innerHtml = $(elem).html()?.replace(/\s|&nbsp;|<br\s*\/?>(?=\s*<\/p>)/gi, '').trim();
        if (!innerHtml) {
          paragraphs.push(new Paragraph('\u00A0'));
          prevWasBlock = true;
        } else {
          const runs = parseRuns($, $(elem));
          if (runs.length) {
            paragraphs.push(new Paragraph({ children: runs }));
            prevWasBlock = true;
          } else {
            paragraphs.push(new Paragraph('\u00A0'));
            prevWasBlock = true;
          }
        }
      } else if (elem.tagName === 'br') {
        paragraphs.push(new Paragraph('\u00A0'));
        prevWasBlock = true;
      } else if (elem.tagName === 'ul' || elem.tagName === 'ol') {
        $(elem).find('li').each((_, li) => {
          const runs = parseRuns($, $(li));
          if (runs.length) {
            paragraphs.push(new Paragraph({ children: runs, bullet: elem.tagName === 'ul' ? { level: 0 } : undefined }));
            prevWasBlock = true;
          }
        });
      } else if (elem.tagName === 'h1' || elem.tagName === 'h2' || elem.tagName === 'h3') {
        const runs = parseRuns($, $(elem));
        if (runs.length) {
          paragraphs.push(new Paragraph({ children: runs, heading: elem.tagName.toUpperCase() as any }));
          prevWasBlock = true;
        }
      }
    } else if (elem.type === 'text') {
      if (elem.data && elem.data.replace(/\s+/g, '') === '') {
        if (prevWasBlock) {
          paragraphs.push(new Paragraph('\u00A0'));
          prevWasBlock = false;
        }
      }
    }
  });
  // Удаляем только хвост из truly empty абзацев
  return trimTrailingEmptyParagraphs(paragraphs);
}

// Функция автозаполнения пустых абзацев DOCX
function fillEmptyParagraphsInDocx(buffer: Buffer): Buffer {
  const zip = new PizZip(buffer);
  let xml = zip.file('word/document.xml')?.asText();
  if (!xml) return buffer;
  const $ = loadXml(xml, { xmlMode: true });
  $('*').each((_, p) => {
    if (p.type === 'tag' && p.name === 'w:p') {
      const hasText = $(p).find('w\\:t, t').filter((_, t) => $(t).text().trim() !== '').length > 0;
      if (!hasText) {
        const run = $('<w:r><w:t xml:space="preserve">&#160;</w:t></w:r>');
        $(p).append(run);
      }
    }
  });
  const newXml = $.xml();
  zip.file('word/document.xml', newXml);
  return zip.generate({ type: 'nodebuffer' });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const output = (formData.get('output') as string)?.toLowerCase() || 'docx';
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ error: 'Поддерживаются только файлы DOCX.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой (максимум 10MB)' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    buffer = fillEmptyParagraphsInDocx(buffer);
    let html: string;
    try {
      const { value } = await mammoth.convertToHtml({ buffer });
      html = value;
    } catch (err) {
      return NextResponse.json({ error: 'Ошибка конвертации DOCX в HTML: ' + String(err) }, { status: 500 });
    }
    let processedHtml: string;
    try {
      processedHtml = typographHtml(html);
    } catch (err) {
      return NextResponse.json({ error: 'Ошибка типографики по HTML: ' + String(err) }, { status: 500 });
    }
    const originalName = file.name.replace(/\.docx$/i, '');
    let fileNameTranslit = transliterate(originalName);
    fileNameTranslit = fileNameTranslit.replace(/[^A-Za-z0-9_-]/g, '_').replace(/[_-]+$/, '');
    if (output === 'html') {
      const encoder = new TextEncoder();
      const htmlBuffer = encoder.encode(processedHtml);
      const asciiFileName = fileNameTranslit;
      const utf8FileName = `${fileNameTranslit}.html`;
      return new NextResponse(htmlBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${asciiFileName}.html"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`,
          'Content-Length': htmlBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
    // DOCX через docx
    let docxBuffer: Buffer;
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: htmlToDocxParagraphs(processedHtml),
          },
        ],
      });
      docxBuffer = await Packer.toBuffer(doc);
    } catch (err) {
      return NextResponse.json({ error: 'Ошибка генерации DOCX: ' + String(err) }, { status: 500 });
    }
    const asciiFileName = fileNameTranslit;
    const utf8FileName = `${fileNameTranslit}.docx`;
    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${asciiFileName}.docx"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`,
        'Content-Length': docxBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}