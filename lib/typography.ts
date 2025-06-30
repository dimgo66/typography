import * as cheerio from 'cheerio';

// Расширенная типографская обработка с сохранением форматирования
export interface FormattedText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
}

export interface FormattedParagraph {
  content: FormattedText[];
  style?: 'normal' | 'heading1' | 'heading2' | 'poetry' | 'quote';
  alignment?: 'left' | 'center' | 'right' | 'justify';
  indent?: number;
  tabStops?: number[];
}

export interface ProcessedDocument {
  paragraphs: FormattedParagraph[];
  metadata: {
    isPoetry: boolean;
    hasFormatting: boolean;
    originalLength: number;
    processedLength: number;
  };
}

export class AdvancedTypographyProcessor {
  private static readonly NON_BREAKING_SPACE = '\u00A0';
  private static readonly THIN_SPACE = '\u2009';
  private static readonly EM_DASH = '—';
  private static readonly ELLIPSIS = '…';
  private static readonly EN_SPACE = '\u2002';

  /**
   * Определяет, является ли текст стихотворением
   */
  static isPoetry(text: string): boolean {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length < 3) {
      return false; // Не считаем поэзией, если меньше 3 строк
    }

    // Признаки стихотворения:
    let poetryScore = 0;
    
    // 1. Короткие строки (меньше 60 символов в среднем)
    const avgLineLength = lines.reduce((sum, line) => sum + line.trim().length, 0) / lines.length;
    if (avgLineLength < 70) poetryScore += 2;
    
    // 2. Много переносов строк
    const lineBreaks = (text.match(/\n/g) || []).length;
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 0 && lineBreaks / wordCount > 0.15) poetryScore += 2;
    
    // 3. Табуляции в начале строк (лесенка)
    const indentedLines = lines.filter(line => line.match(/^\s{2,}/) || line.startsWith('\t')).length;
    if (lines.length > 0 && indentedLines / lines.length > 0.3) poetryScore += 3;
    
    // 4. Заглавные буквы в начале строк
    const capitalizedLines = lines.filter(line => /^[А-ЯЁA-Z]/.test(line.trim())).length;
    if (lines.length > 0 && capitalizedLines / lines.length > 0.7) poetryScore += 1;
    
    // 5. Ритмичность (повторяющаяся длина строк)
    const lineLengths = lines.map(line => line.trim().length);
    const lengthVariance = this.calculateVariance(lineLengths);
    if (lengthVariance < 120) poetryScore += 1;
    
    return poetryScore >= 5;
  }

  /**
   * Вычисляет дисперсию массива чисел
   */
  private static calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Обрабатывает текст с сохранением форматирования
   */
  static processWithFormatting(paragraphs: FormattedParagraph[]): FormattedParagraph[] {
    const fullText = paragraphs.map(p => 
      p.content.map(c => c.text).join('')
    ).join('\n');
    
    const isPoetryText = this.isPoetry(fullText);
    
    return paragraphs.map(paragraph => {
      const processedContent = paragraph.content.map(item => ({
        ...item,
        text: isPoetryText 
          ? this.processPoetryText(item.text)
          : this.processRegularText(item.text)
      }));

      return {
        ...paragraph,
        content: processedContent,
        style: isPoetryText && paragraph.style === 'normal' ? 'poetry' : paragraph.style
      };
    });
  }

  /**
   * Обработка обычного текста
   */
  static processRegularText(text: string, isFirst: boolean = false): string {
    let result = text;

    // Основные правила типографики
    result = this.applyPunctuation(result);
    result = this.applyBasicRules(result, isFirst);
    result = this.applyNonBreakingSpaces(result);
    
    // Удаляем все пустые строки в конце текста
    result = result.replace(/(\r?\n)+$/g, '');

    return result;
  }

  /**
   * Обработка стихотворного текста с сохранением структуры
   */
  static processPoetryText(text: string): string {
    let result = text;
    
    // Сохраняем табуляции и отступы
    const lines = result.split('\n');
    const processedLines = lines.map(line => {
      // Сохраняем начальные пробелы и табуляции
      const indent = line.match(/^[\s\t]*/)?.[0] || '';
      const content = line.substring(indent.length);
      
      if (content.trim().length === 0) {
        return line; // Пустые строки не обрабатываем
      }
      
      // Обрабатываем только содержимое, сохраняя отступы
      let processedContent = content;
      
      // Мягкая обработка для стихов (меньше изменений)
      processedContent = this.applyPoetryRules(processedContent);
      
      return indent + processedContent;
    });
    
    return processedLines.join('\n');
  }

  /**
   * Применяет базовые правила типографики
   */
  private static applyBasicRules(text: string, isFirst: boolean = false): string {
    let result = text;

    // 0. Защита от слипания слов: временно заменяем > < на >\u200B< (невидимый разделитель)
    result = result.replace(/>\s+</g, '>\u200B<');

    // 1. Множественные пробелы (заменяем любые последовательности пробельных символов, кроме \n, на один пробел)
    result = result.replace(/[ \t\v\f\r]{2,}/g, ' ');

    // 1a. Убираем пробелы в начале и конце каждой строки
    if (isFirst) {
      // Для первого фрагмента текста в абзаце убираем начальные пробелы
      result = result.replace(/^\s+/, '');
    }

    // 1b. Между знаком № и цифрой всегда неразрывный пробел
    result = result.replace(/№\s*(\d+)/g, '№\u00A0$1');

    // 2. Защита дефиса между буквами (буква-дефис-буква, сложные слова, фамилии, топонимы и т.д.)
    result = result.replace(/(\p{L})-(\p{L})/gu, '$1[[HYPHEN]]$2');

    // 3. Защита дефиса в сложных словах и наречиях
    const hyphenWords = [
      'из-за', 'из-под', 'по-русски', 'по-моему', 'по-твоему', 'по-нашему', 'по-вашему',
      'кое-что', 'кое-как', 'кто-нибудь', 'что-нибудь', 'где-нибудь', 'когда-либо',
      'как-то', 'все-таки', 'по-своему', 'по-старому', 'по-новому', 'по-английски',
      'по-французски', 'по-немецки', 'по-итальянски', 'по-испански', 'по-китайски',
      'по-японски', 'по-украински', 'по-белорусски', 'по-польски', 'по-чешски',
      'по-гречески', 'по-турецки', 'по-арабски', 'по-еврейски', 'по-латински',
      'по-современному', 'по-старинному', 'по-детски', 'по-взрослому', 'по-товарищески',
      'по-приятельски', 'по-родственному', 'по-отечески', 'по-матерински', 'по-братски',
      'по-сестрински', 'по-деловому', 'по-дружески', 'по-особенному', 'по-особому'
    ];
    hyphenWords.forEach(word => {
      // Защищаем оба варианта: с "е" и с "ё" (например, всё-таки/все-таки)
      const safe = word.replace(/-/g, '[[HYPHEN]]');
      const regex = new RegExp(word.replace('е', '[её]'), 'gi');
      result = result.replace(regex, safe);
    });

    // 4. Защита сокращений
    result = result
      .replace(/\bт\.-е\./gi, '[[T_E]]')
      .replace(/\bт\.-д\./gi, '[[T_D]]')
      .replace(/\bт\.-п\./gi, '[[T_P]]')
      .replace(/\bт\.-к\./gi, '[[T_K]]')
      .replace(/\bт\.-н\./gi, '[[T_N]]')
      .replace(/\bт\.-о\./gi, '[[T_O]]')
      .replace(/\bи\ т\.-д\./gi, '[[I_T_D]]');

    // 5. Диапазон чисел: 1966-1977 → 1966–1977 (en dash), без пробелов вокруг
    result = result.replace(/(\d{1,4})\s*-\s*(\d{1,4})/g, '$1–$2');
    // 5a. Удаляем пробелы вокруг en dash между числами (2020 - 2021 → 2020–2021)
    result = result.replace(/(\d{1,4})\s*–\s*(\d{1,4})/g, '$1–$2');

    // 6. Замена дефисов и тире на длинное тире внутри предложений
    result = result.replace(/\s(-|–)\s/g, this.NON_BREAKING_SPACE + this.EM_DASH + ' ');

    // 10. Возвращаем сокращения, дефисы внутри слов и сложных слов
    result = result
      .replace(/\[\[T_E\]\]/g, 'т.-е.')
      .replace(/\[\[T_D\]\]/g, 'т.-д.')
      .replace(/\[\[T_P\]\]/g, 'т.-п.')
      .replace(/\[\[T_K\]\]/g, 'т.-к.')
      .replace(/\[\[T_N\]\]/g, 'т.-н.')
      .replace(/\[\[T_O\]\]/g, 'т.-о.')
      .replace(/\[\[I_T_D\]\]/g, 'и т.д.')
      .replace(/\[\[HYPHEN\]\]/g, '-');

    // 11. Замена трех точек на многоточие
    result = result.replace(/\.{3,}/g, this.ELLIPSIS);
    
    // 12. Пробелы перед знаками препинания
    result = result.replace(/\s+([,.;:!?])/g, '$1');
    
    // 13. Пробелы после знаков препинания
    result = result.replace(/([,.;:!?])([А-Яа-яёЁA-Za-z])/g, '$1 $2');
    
    // 14. Пробелы в скобках
    result = result.replace(/\(\s+/g, '(');
    result = result.replace(/\s+\)/g, ')');

    // В самом конце: нормализуем двойные пробелы до одного
    result = result.replace(/ {2,}/g, ' ');

    // 99. Восстанавливаем невидимый разделитель между тегами
    result = result.replace(/\u200B/g, ' ');

    // После однобуквенных предлогов — неразрывный пробел (улучшенная регулярка)
    result = result.replace(/(^|[\s.,;:!?"'«»()\[\]{}-])([вксуояи])\s+([А-Яа-яA-Za-z])/gimu, '$1$2\u00A0$3');

    // Между числом и словом — неразрывный пробел
    result = result.replace(/(\d)\s+([А-Яа-яA-Za-z])/g, '$1\u00A0$2');

    return result;
  }

  /**
   * Применяет правила для стихотворений (более деликатно)
   */
  private static applyPoetryRules(text: string): string {
    let result = text;

    // Только основные правила, не трогаем структуру
    result = result.replace(/--/g, this.EM_DASH);
    result = result.replace(/\.{3,}/g, this.ELLIPSIS);
    
    // Осторожно с пробелами в стихах
    result = result.replace(/\s+([,.;:!?])/g, '$1');
    result = result.replace(/([,.;:!?])([А-Яа-яёЁ])/g, '$1 $2');

    return result;
  }

  /**
   * Применяет неразрывные пробелы
   */
  private static applyNonBreakingSpaces(text: string): string {
    let result = text;

    // Короткие слова
    const shortWords = ['а', 'в', 'и', 'к', 'о', 'с', 'у', 'не', 'на', 'от', 'до', 'за', 'из', 'по', 'со', 'во', 'об'];
    shortWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\s+`, 'gi');
      result = result.replace(regex, word + this.NON_BREAKING_SPACE);
    });
    
    // Числа с единицами измерения
    result = result.replace(/(\d+)\s+(кг|г|т|мг|мм|дм|см|м|км|л|мл|руб|коп|долл|евро)/gi, 
      `$1${this.NON_BREAKING_SPACE}$2`);
    
    // Инициалы с фамилией
    // Инициалы с фамилией (сначала два инициала, потом один)
    // Исправляем инициалы, допускаем отсутствие пробелов между ними
    result = result.replace(/([А-ЯЁ]\.)\s*([А-ЯЁ]\.)\s*([А-ЯЁ][а-яё]+)/g,
      `$1${this.NON_BREAKING_SPACE}$2${this.NON_BREAKING_SPACE}$3`);
    result = result.replace(/([А-ЯЁ]\.)\s*([А-ЯЁ][а-яё]+)/g,
      `$1${this.NON_BREAKING_SPACE}$2`);

    return result;
  }

  /**
   * Применяет правила пунктуации
   */
  private static applyPunctuation(text: string): string {
    let result = text;

    // Диалоги (прямая речь в начале строки)
    // Заменяем дефис на тире в начале строки (прямая речь)
    result = result.replace(/(^|\n)([ \t]*)-/gm, '$1$2' + this.EM_DASH + ' ');
    
    // Проценты
    result = result.replace(/(\d+)\s*%/g, `$1${this.THIN_SPACE}%`);

    return result;
  }

  /**
   * Определяет структуру четверостиший
   */
  static detectStanzaStructure(text: string): string[] {
    const lines = text.split('\n');
    const stanzas: string[] = [];
    let currentStanza: string[] = [];
    let emptyLineCount = 0;

    for (const line of lines) {
      if (line.trim().length === 0) {
        emptyLineCount++;
        if (emptyLineCount >= 1 && currentStanza.length > 0) {
          // Конец строфы
          stanzas.push(currentStanza.join('\n'));
          currentStanza = [];
          emptyLineCount = 0;
        }
      } else {
        currentStanza.push(line);
        emptyLineCount = 0;
      }
    }

    // Добавляем последнюю строфу
    if (currentStanza.length > 0) {
      stanzas.push(currentStanza.join('\n'));
    }

    return stanzas;
  }

  /**
   * Обрабатывает простой текст (для обратной совместимости)
   */
  static process(text: string, options?: { isFirst?: boolean }): string {
    const isPoetryText = this.isPoetry(text);
    
    if (isPoetryText) {
      return this.processPoetryText(text);
    } else {
      return this.processRegularText(text, options?.isFirst);
    }
  }

  /**
   * Создает статистику обработки
   */
  static getProcessingStats(originalText: string, processedText: string): {
    originalLength: number;
    processedLength: number;
    isPoetry: boolean;
    spacesReplaced: number;
    dashesReplaced: number;
    ellipsisReplaced: number;
    stanzaCount?: number;
  } {
    const isPoetryText = this.isPoetry(originalText);
    
    return {
      originalLength: originalText.length,
      processedLength: processedText.length,
      isPoetry: isPoetryText,
      spacesReplaced: (originalText.match(/[ ]{2,}/g) || []).length,
      dashesReplaced: (originalText.match(/--/g) || []).length,
      ellipsisReplaced: (originalText.match(/\.{3,}/g) || []).length,
      stanzaCount: isPoetryText ? this.detectStanzaStructure(originalText).length : undefined,
    };
  }

  /**
   * Получить пример текста (обновленный)
   */
  static getExampleText(): string {
    return `Пример текста с   типографскими ошибками

Проблемы  с   пробелами    и знаками   ,точками   .
Дефисы  --  вместо тире и многоточие...
Плохие пробелы в скобках( вот так ).

Неразрывные пробелы:
В магазин за хлебом.
К врачу на осмотр.
На работу в офис.
Вес: 10 кг, рост: 180 см.
А. С. Пушкин написал много произведений.

Диалоги:
- Привет! Как дела?
- Хорошо, спасибо за вопрос.

Проценты: скидка 15% на все товары.

ПРИМЕР СТИХОТВОРЕНИЯ:

        Белеет парус одинокой
        В тумане моря голубом...
        Что ищет он в стране далекой?
        Что кинул он в краю родном?

    Играют волны -- ветер свищет,
    И мачта гнется и скрыпит...
        Увы! он счастия не ищет
        И не от счастия бежит!

Под ним струя светлей лазури,
Над ним луч солнца золотой...
    А он, мятежный, просит бури,
    Как будто в бурях есть покой!

Этот текст содержит различные типографские ошибки и демонстрирует работу с поэзией.`;
  }
}

// Экспорт для обратной совместимости
export const TypographyProcessor = AdvancedTypographyProcessor;

export function typographText(text: string, options?: { isFirst?: boolean }): string {
  const processed = AdvancedTypographyProcessor.process(text, options);
  // Заменяем символ перевода строки на знак абзаца
  return processed.replace(/\n/g, '¶');
}

function typographHtml(html: string): string {
  const $ = cheerio.load(html);
  $('body, body *').contents().each(function (this: any) {
    // Если это текст внутри пустого <p> — не трогаем
    if (this.type === 'text') {
      const parent = this.parent as any;
      if (
        parent &&
        parent.tagName === 'p' &&
        (!this.data || this.data.replace(/\s|\u00A0|&nbsp;/g, '') === '')
      ) {
        return;
      }
      this.data = typographText(this.data || '');
    }
  });
  return $.html();
}