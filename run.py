import os
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = (Path(__file__).parent / "backend").resolve()
sys.path.insert(0, str(backend_path))

from app.main import app as fastapi_app

# Mount Gradio interface if gradio is available (for Hugging Face Spaces Gradio SDK)
try:
    import gradio as gr
    from app.services.arabic_matcher import ArabicMatcher

    matcher = ArabicMatcher()
    matcher.initialize()

    def search_verse_text(query):
        if not query or not query.strip():
            return "Please enter an Arabic verse phrase."
        matches = matcher.match_text(query.strip(), limit=5)
        if not matches:
            return "No matching verses found."

        output = []
        for i, m in enumerate(matches, 1):
            v = m["verse"]
            output.append(
                f"### #{i} Surah {v['surah_name_english']} ({v['surah_name_arabic']}) {v['surah_number']}:{v['ayah_number']}\n"
                f"**Match Confidence:** {int(m['confidence'] * 100)}%\n\n"
                f"> **{v['arabic_text']}**\n\n"
                f"*Phonetic Transliteration:* {v.get('transliteration', '')}\n\n"
                f"*Translation:* {v.get('english_translation', '')}"
            )
        return "\n\n---\n\n".join(output)

    with gr.Blocks(title="Quran Verse Identifier", theme=gr.themes.Soft()) as demo:
        gr.Markdown("""
        # 📖 Quran Verse Identifier
        Instant recitation identification across all 6,236 verses using phonetic normalization and audio intelligence.
        """)

        with gr.Row():
            with gr.Column():
                query_input = gr.Textbox(
                    label="Recited Arabic Text",
                    placeholder="e.g. الحمد لله رب العالمين or قل هو الله احد",
                    lines=2
                )
                search_btn = gr.Button("Search Across 6,236 Verses", variant="primary")
            with gr.Column():
                result_output = gr.Markdown(label="Identification Results")

        search_btn.click(search_verse_text, inputs=[query_input], outputs=[result_output])

    # Mount Gradio onto the FastAPI app at /gradio
    app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")
except Exception:
    app = fastapi_app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)