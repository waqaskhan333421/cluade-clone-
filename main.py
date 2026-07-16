from app import create_app
import openai
import sys

print(f"--- STARTING FLASK APP ---", flush=True)
print(f"Python Executable: {sys.executable}", flush=True)
print(f"OpenAI Version: {openai.__version__}", flush=True)

app = create_app()

if __name__ == '__main__':
    # Run the Flask development server on localhost:5000
    app.run(host='127.0.0.1', port=5000, debug=True)

