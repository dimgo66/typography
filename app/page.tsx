export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
      <h1>Типографика для .docx</h1>
      <p>Добро пожаловать в сервис автоматической типографской обработки русскоязычных текстов в формате <b>.docx</b> с сохранением форматирования и сносок.</p>
      <ul>
        <li>Загрузите файл .docx — получите обратно корректно оформленный документ.</li>
        <li>Все правила типографики реализованы по ГОСТ и редакторским стандартам.</li>
        <li>Сервис поддерживает только .docx (Word 2007+).</li>
      </ul>
      <p style={{marginTop: 32, color: '#888'}}>© {new Date().getFullYear()} dimgo66 / typography-app</p>
    </main>
  );
}