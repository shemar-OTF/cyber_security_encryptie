"""Lokale webapp. Start met python3 app.py en open http://127.0.0.1:8000."""
import importlib.util
import os
from pathlib import Path
import sys
import threading
import webbrowser

# Ook python3 app.py werkt zonder handmatig activeren als .venv is geïnstalleerd.
if __name__ == '__main__' and any(importlib.util.find_spec(name) is None for name in ('flask', 'cryptography')):
    environment = Path(__file__).resolve().parent / '.venv'
    interpreter = environment / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if interpreter.exists() and Path(sys.prefix).resolve() != environment.resolve():
        print('Tekstkluis gebruikt de geïnstalleerde projectomgeving.', flush=True)
        os.execv(str(interpreter), [str(interpreter), str(Path(__file__).resolve()), *sys.argv[1:]])
    raise SystemExit('Installeer eerst de dependencies zoals beschreven in README.md.')

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from crypto_service import InputError, decrypt_text, encrypt_text, generate_key, generate_password, generate_username

app = Flask(__name__)
app.config.update(MAX_CONTENT_LENGTH=1_000_000, TRUSTED_HOSTS=['127.0.0.1', 'localhost'])


@app.before_request
def protect_local_api():
    if request.path.startswith('/api/') and request.method == 'POST':
        origin = request.headers.get('Origin')
        if origin and origin != request.host_url.rstrip('/'):
            return jsonify(error='Dit verzoek komt niet van de lokale webapp.'), 403
        if request.headers.get('X-Tekstkluis') != '1':
            return jsonify(error='Open deze functie vanuit Tekstkluis.'), 403
        if not request.is_json:
            return jsonify(error='Verstuur de invoer als JSON.'), 415


@app.after_request
def security_headers(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; script-src 'self'; style-src 'self'; "
        "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
        "base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    )
    return response


def payload():
    data = request.get_json()
    if not isinstance(data, dict):
        raise InputError('De invoer moet een JSON-object zijn.')
    return data


def text_field(data, name):
    value = data.get(name)
    if not isinstance(value, str):
        raise InputError('Vul alle tekstvelden in.')
    return value


@app.get('/')
def index():
    return render_template('index.html')


@app.post('/api/encrypt')
def encrypt():
    data = payload()
    text = text_field(data, 'text')
    key = generate_key()
    return jsonify(result=encrypt_text(text, key), key=key)


@app.post('/api/decrypt')
def decrypt():
    data = payload()
    return jsonify(result=decrypt_text(text_field(data, 'text'), text_field(data, 'key')))


@app.post('/api/generate')
def generate():
    data = payload()
    options = {name: data.get(name, True) for name in ('lowercase', 'uppercase', 'digits', 'special')}
    password = generate_password(data.get('length', 24), **options)
    return jsonify(password=password)


@app.post('/api/username')
def username():
    data = payload()
    return jsonify(username=generate_username(data.get('level', 'simple'), data.get('idea', '')))


@app.errorhandler(InputError)
def invalid_input(error):
    return jsonify(error=str(error)), 400


@app.errorhandler(HTTPException)
def http_error(error):
    messages = {400: 'De invoer is ongeldig.', 404: 'Deze pagina bestaat niet.',
                405: 'Deze actie is niet beschikbaar.', 413: 'De invoer is te groot.',
                415: 'Verstuur de invoer als JSON.'}
    return jsonify(error=messages.get(error.code, 'Het verzoek is niet gelukt.')), error.code


if __name__ == '__main__':
    url = 'http://127.0.0.1:8000'
    print(f'Open Tekstkluis in je browser: {url}', flush=True)
    # Eén lokale poort, zonder debugger of blootstelling aan het netwerk.
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host='127.0.0.1', port=8000, debug=False, use_reloader=False)
