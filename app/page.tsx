'use client';

import { useState } from 'react';
import { TypographyProcessor } from '@/lib/typography';

export default function Home() {
  const [text, setText] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleTextProcess = () => {
    if (!text.trim()) {
      setMessage('Введите текст для обработки');
      return;
    }
    const processed = TypographyProcessor.process(text);
    setProcessedText(processed);
    setMessage('Текст успешно обработан');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleFileProcess = async () => {
    if (!file) {
      setMessage('Выберите файл для обработки');
      return;
    }
    
    setIsProcessing(true);
    setMessage('Обработка файла...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Получаем имя файла из заголовков ответа или создаем свое
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `${file.name.replace(/\.(docx?|txt)$/i, '')}_обработано.txt`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]*)/);
        if (fileNameMatch) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      }
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      
      // Добавляем элемент в DOM, кликаем и удаляем
      document.body.appendChild(a);
      
      // Небольшая задержка для обеспечения корректной работы в некоторых браузерах
      setTimeout(() => {
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setMessage('Файл успешно обработан и скачан');
    } catch (error) {
      console.error('Ошибка:', error);
      setMessage('Произошла ошибка при обработке файла');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExample = () => {
    setText(TypographyProcessor.getExampleText());
    setMessage('Загружен пример текста');
  };

  const downloadProcessedText = () => {
    if (!processedText) return;
    
    // Создаем файл с BOM для корректной кодировки
    const textWithBOM = '\uFEFF' + processedText;
    const blob = new Blob([textWithBOM], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'обработанный-текст.txt';
    a.style.display = 'none';
    
    document.body.appendChild(a);
    setTimeout(() => {
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    setMessage('Обработанный текст скачан');
  };

  const downloadDemo = async () => {
    try {
      const response = await fetch('/api/demo');
      if (!response.ok) {
        throw new Error('Ошибка создания демо-файла');
      }

      const blob = await response.blob();
      
      // Получаем имя файла из заголовков ответа или используем стандартное
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'демо-типографика-с-поэзией.txt';
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]*)/);
        if (fileNameMatch) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      }
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      
      // Добавляем элемент в DOM, кликаем и удаляем
      document.body.appendChild(a);
      
      // Небольшая задержка для обеспечения корректной работы в некоторых браузерах
      setTimeout(() => {
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setMessage('Демо-файл с примерами поэзии скачан');
    } catch (error) {
      console.error('Ошибка:', error);
      setMessage('Ошибка создания демо-файла');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            📝 Типографский процессор Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Профессиональная обработка русского текста с сохранением форматирования. 
            Поддержка поэзии, сохранение курсива и жирного шрифта, правильная обработка стихотворных отступов и табуляций.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">📄 Word документы</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">🎭 Поэзия</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">✨ Форматирование</span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full">📏 Табуляции</span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-center ${
            message.includes('ошибка') || message.includes('Ошибка') 
              ? 'bg-red-100 text-red-800 border border-red-300' 
              : 'bg-green-100 text-green-800 border border-green-300'
          }`}>
            {message}
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Text Processing */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">💬 Обработка текста</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Исходный текст:
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Введите текст для обработки..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTextProcess}
                  disabled={!text.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  ✨ Обработать
                </button>
              </div>

              {processedText && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Обработанный текст:
                    </label>
                    <button
                      onClick={downloadProcessedText}
                      className="px-4 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      💾 Скачать
                    </button>
                  </div>
                  <textarea
                    value={processedText}
                    readOnly
                    className="w-full h-40 p-4 border border-green-300 rounded-lg resize-none bg-green-50 font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* File Processing */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">📄 Обработка файлов</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите файл:
                </label>
                <div className="mb-2 text-gray-700 text-sm">
                  Поддерживается только <b>.docx</b> (Microsoft Word). Форматирование и сноски сохраняются.
                </div>
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="w-full p-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleFileProcess}
                  disabled={!file || isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '⏳ Обработка...' : '🚀 Обработать файл'}
                </button>
              </div>

              {file && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    📎 <span className="font-medium">{file.name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Размер: {(file.size / 1024).toFixed(1)} КБ
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">📚 Применяемые правила</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-lg text-blue-700 mb-3">🔤 Пробелы</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Удаление множественных пробелов</li>
                <li>• Пробелы перед знаками препинания</li>
                <li>• Пробелы в скобках</li>
                <li>• Нормализация переносов строк</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-green-700 mb-3">➖ Тире и знаки</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Замена -- на тире (—)</li>
                <li>• Замена ... на многоточие (…)</li>
                <li>• Оформление диалогов</li>
                <li>• Правильные отбивки</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-purple-700 mb-3">🔗 Неразрывные пробелы</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Короткие слова (а, в, и, на, от)</li>
                <li>• Числа с единицами (5 кг, 10 м)</li>
                <li>• Инициалы (А. С. Пушкин)</li>
                <li>• Проценты (15 %)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-lg text-indigo-700 mb-4">🆕 Новые возможности</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🎭 Обработка поэзии</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Автоматическое определение стихов</li>
                  <li>• Сохранение структуры четверостиший</li>
                  <li>• Сохранение табуляций для лесенки</li>
                  <li>• Деликатная обработка без потери ритма</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">✨ Сохранение форматирования</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Курсив и жирный шрифт</li>
                  <li>• Отступы и выравнивание</li>
                  <li>• Структура документа Word</li>
                  <li>• Специальные стили для поэзии</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="w-full border-t mt-12 py-6 bg-white/80 text-center text-gray-600 text-sm flex flex-col items-center gap-2">
        <div>
          © {new Date().getFullYear()} Дмитрий Горяченков
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/dimgo66/typography"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline text-blue-700"
          >
            <svg height="18" viewBox="0 0 16 16" width="18" aria-hidden="true" fill="currentColor" className="inline"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path></svg>
            GitHub
          </a>
          <a
            href="https://github.com/dimgo66/typography/stargazers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded hover:bg-yellow-200 text-yellow-800"
          >
            ★ <span id="github-stars">Загрузка...</span>
          </a>
        </div>
        <script dangerouslySetInnerHTML={{__html:`fetch('https://api.github.com/repos/dimgo66/typography').then(r=>r.json()).then(d=>{const s=document.getElementById('github-stars');if(s)s.textContent=d.stargazers_count})`}} />
      </footer>
    </div>
  );
}