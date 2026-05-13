import pdfplumber
import json
import re
import time
from deep_translator import GoogleTranslator

def translate_with_math(text, translator):
    """Переводит текст, защищая формулы LaTeX от искажения."""
    if not text.strip():
        return text

    # Находим все формулы $...$
    math_expressions = re.findall(r'\$.*?\$', text)
    
    # Заменяем формулы на заглушки {MATH0}, {MATH1}...
    temp_text = text
    for i, expr in enumerate(math_expressions):
        temp_text = temp_text.replace(expr, f"{{MATH{i}}}")

    try:
        # Переводим текст с заглушками
        translated = translator.translate(temp_text)
        
        # Возвращаем формулы на место
        for i, expr in enumerate(math_expressions):
            translated = translated.replace(f"{{MATH{i}}}", expr)
            # Иногда переводчик добавляет пробелы в заглушки, фиксим это:
            translated = translated.replace(f"{{ MATH{i} }}", expr)
        
        return translated
    except Exception as e:
        print(f"Ошибка перевода: {e}")
        return text

def parse_pdf(file_path):
    questions = []
    translator = GoogleTranslator(source='uz', target='ru')
    
    print(f"--- Чтение файла {file_path} ---")
    full_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

    # Более гибкий паттерн: ищет цифру с точкой, текст, а затем варианты 1), 2), 3), 4)
    # Учитывает возможные переносы строк (\s*)
    pattern = re.compile(
        r'(\d+)\.\s*(.*?)\s*1\)\s*(.*?)\s*2\)\s*(.*?)\s*3\)\s*(.*?)\s*4\)\s*(.*?)(?=\s*\d+\.|\Z)', 
        re.DOTALL
    )
    
    matches = pattern.findall(full_text)
    
    if not matches:
        print("Вопросы не найдены. Проверь структуру PDF или регулярное выражение.")
        return []

    print(f"Найдено вопросов: {len(matches)}. Начинаю перевод...")

    for m in matches:
        q_id = int(m[0])
        q_text_uz = m[1].strip()
        options_uz = [m[2].strip(), m[3].strip(), m[4].strip(), m[5].strip()]
        
        correct_idx = 0
        clean_options = []
        
        for i, opt in enumerate(options_uz):
            if '*' in opt:
                correct_idx = i
            clean_options.append(opt.replace('*', '').strip())

        # Перевод текста вопроса и вариантов
        q_text_ru = translate_with_math(q_text_uz, translator)
        
        # Добавляем <br> перед формулой, если она есть в вопросе (как в твоем примере)
        if '$' in q_text_ru and '<br>' not in q_text_ru:
            q_text_ru = q_text_ru.replace('$', '<br> $', 1)

        options_ru = [translate_with_math(opt, translator) for opt in clean_options]

        questions.append({
            "id": q_id,
            "question": q_text_ru,
            "options": options_ru,
            "correctIndex": correct_idx
        })

        if q_id % 5 == 0:
            print(f"Обработано вопросов: {q_id}")
            time.sleep(0.5) # Пауза, чтобы не забанили

    return questions

# Запуск скрипта
if __name__ == "__main__":
    file_name = "HISOB.pdf" # Убедись, что файл лежит в той же папке
    try:
        data = parse_pdf(file_name)
        if data:
            with open('questions.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"--- Успех! Создано {len(data)} вопросов в questions.json ---")
    except Exception as e:
        print(f"Критическая ошибка: {e}")
        
