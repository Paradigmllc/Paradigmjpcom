from flask import Flask, request, jsonify
import subprocess, json

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'maigret'})

@app.route('/search', methods=['POST'])
def search():
    username = request.json.get('username', '')
    if not username:
        return jsonify({'ok': False, 'error': 'missing username'}), 400
    try:
        r = subprocess.run(
            ['maigret', username, '--json', 'simple', '--timeout', '30', '--no-recursive'],
            capture_output=True, text=True, timeout=90
        )
        lines = [l for l in r.stdout.strip().split('\n') if l]
        sites = []
        for l in lines:
            try:
                d = json.loads(l)
                if isinstance(d, dict):
                    sites.append(d)
            except Exception:
                pass
        return jsonify({'ok': True, 'data': {'profiles_found': len(sites), 'sites': sites[:30]}})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
