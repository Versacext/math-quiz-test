import pdfplumber
import json
import re
from deep_translator import GoogleTranslator

def translate_text(text, translator):
    # Если в тексте только формулы (начинаются с $), не переводим
    if text.strip().startswith('$') and text.strip().endswith('$'):
        return text
    try:
        # Переводим с узбекского на русский
        return translator.translate(text)
    except:
        return text

def parse_pdf(file_path):
    questions = []
    translator = GoogleTranslator(source='uz', target='ru')
    
    print("--- Начинаю чтение PDF ---")
    with pdfplumber.open(file_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"

    # Регулярное выражение для поиска вопросов и 4 вариантов ответов
    # Ищем: Номер. Текст вопроса 1) Вариант 2) Вариант 3) Вариант 4) Вариант
    pattern = re.compile(r'(\d+)\.\s*(.*?)\s*1\)\s*(.*?)\s*2\)\s*(.*?)\s*3\)\s*(.*?)\s*4\)\s*(.*?)(?=\s*\d+\.|\Z)', re.DOTALL)
    
    matches = pattern.findall(full_text)
    
    print(f"Найдено вопросов: {len(matches)}. Начинаю перевод (это займет пару минут)...")

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

        # Перевод
        q_text_ru = translate_text(q_text_uz, translator)
        options_ru = [translate_text(opt, translator) for opt in clean_options]

        questions.append({
            "id": q_id,
            "question": q_text_ru,
            "options": options_ru,
            "correctIndex": correct_idx,
            "hint": "Используйте свойства интегралов или правила дифференцирования."
        })
        if q_id % 10 == 0:
            print(f"Обработано: {q_id}%")

    return questions

# Запуск
try:
    # Убедись, что имя файла совпадает с твоим!
    data = parse_pdf("HISOB.pdf") 
    with open('questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("--- Успех! Файл questions.json готов ---")
except Exception as e:
    print(f"Ошибка: {e}")
