from flask import Flask, request, jsonify
import subprocess, json

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'katana'})

@app.route('/crawl', methods=['POST'])
def crawl():
    url = request.json.get('url', '')
    if not url:
        return jsonify({'ok': False, 'error': 'missing url'}), 400
    try:
        r = subprocess.run(
            ['katana', '-u', url, '-headless', '-silent', '-jc', '-system-chrome', '-timeout', '30', '-depth', '2'],
            capture_output=True, text=True, timeout=90
        )
        lines = [l for l in r.stdout.strip().split('\n') if l]
        data = []
        for l in lines:
            try:
                data.append(json.loads(l))
            except Exception:
                data.append(l)
        return jsonify({'ok': True, 'data': {'crawled': len(data), 'urls': data[:200]}})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
