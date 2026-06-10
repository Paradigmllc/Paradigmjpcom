from flask import Flask, request, jsonify
import subprocess, json, shutil, tempfile

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'spiderfoot'})

@app.route('/scan', methods=['POST'])
def scan():
    target = request.json.get('target', '')
    modules = request.json.get('modules', ['sfp_dns', 'sfp_whois', 'sfp_sslcert', 'sfp_email', 'sfp_webserver'])
    if not target:
        return jsonify({'ok': False, 'error': 'missing target'}), 400
    tmp = tempfile.mkdtemp()
    try:
        r = subprocess.run(
            ['python3', '-m', 'sf', '-s', target, '-m', ','.join(modules), '-o', 'json', '-q'],
            capture_output=True, text=True, timeout=120, cwd=tmp
        )
        lines = [l for l in r.stdout.strip().split('\n') if l]
        data = []
        for l in lines:
            try:
                data.append(json.loads(l))
            except Exception:
                pass
        return jsonify({'ok': True, 'data': {'results': data, 'count': len(data)}})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
