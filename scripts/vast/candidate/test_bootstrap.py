"""No-network checks for the isolated candidate loader; no GPU rental."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

import pilot_gpu_bootstrap as bootstrap


class BootstrapTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.content = b"tiny verified fixture"
        self.digest = hashlib.sha256(self.content).hexdigest()
        self.item = ("org/model", "pinned-revision", "vae/fixture.safetensors",
                     len(self.content), self.digest)
        self.target = self.root / self.item[2]
        binary = patch.object(bootstrap.shutil, "which", return_value="/usr/bin/aria2c")
        binary.start()
        self.addCleanup(binary.stop)

    def write_download(self, args, **kwargs):
        self.assertEqual(kwargs["timeout"], 900)
        self.assertTrue(kwargs["check"])
        self.assertIn("--continue=true", args)
        self.assertIn("--split=8", args)
        self.assertIn("/resolve/pinned-revision/", args[-1])
        self.target.with_suffix(".pilot-part").write_bytes(self.content)

    def test_download_verified_before_publish(self):
        with patch.object(bootstrap.subprocess, "run", side_effect=self.write_download):
            result = bootstrap.fetch_model(self.root, self.item)
        self.assertEqual(result["sha256"], self.digest)
        self.assertEqual(self.target.read_bytes(), self.content)
        self.assertFalse(self.target.with_suffix(".pilot-part").exists())

    def test_exact_cache_avoids_transfer(self):
        self.target.parent.mkdir()
        self.target.write_bytes(self.content)
        with patch.object(bootstrap.subprocess, "run") as run:
            bootstrap.fetch_model(self.root, self.item)
        run.assert_not_called()

    def test_corrupt_cache_is_not_trusted(self):
        self.target.parent.mkdir()
        self.target.write_bytes(b"x" * len(self.content))
        with patch.object(bootstrap.subprocess, "run") as run:
            with self.assertRaisesRegex(RuntimeError, "Existing candidate"):
                bootstrap.fetch_model(self.root, self.item)
        run.assert_not_called()

    def test_corrupt_transfer_never_published(self):
        self.content = b"y" * len(self.content)
        with patch.object(bootstrap.subprocess, "run", side_effect=self.write_download):
            with self.assertRaisesRegex(RuntimeError, "Downloaded candidate"):
                bootstrap.fetch_model(self.root, self.item)
        self.assertFalse(self.target.exists())

    def test_timeout_retains_partial_for_resume(self):
        self.target.parent.mkdir()
        partial = self.target.with_suffix(".pilot-part")
        partial.write_bytes(b"partial")
        with patch.object(bootstrap.subprocess, "run", side_effect=subprocess.TimeoutExpired("aria2c", 900)):
            with self.assertRaises(subprocess.TimeoutExpired):
                bootstrap.fetch_model(self.root, self.item)
        self.assertEqual(partial.read_bytes(), b"partial")
        self.assertFalse(self.target.exists())

    def test_source_pin_cannot_be_bypassed(self):
        with self.assertRaisesRegex(RuntimeError, "Pinned provisioner"):
            bootstrap.candidate_provisioner(b"untrusted script")

    def test_reference_profile_excludes_motion_weights(self):
        selected = bootstrap.selected_models({"PILOT_REFERENCE_ONLY": "1"})
        self.assertEqual(len(selected), 3)
        self.assertTrue(all("Qwen-Image" in item[0] for item in selected))

    def test_continuation_profile_excludes_image_weights(self):
        selected = bootstrap.selected_models({"PILOT_REUSE_MOTION": "1"})
        self.assertEqual(len(selected), 4)
        self.assertTrue(all("Wan_2.2" in item[0] for item in selected))

    def test_full_profile_retains_all_pins(self):
        self.assertEqual(bootstrap.selected_models({}), bootstrap.MODELS)

    def test_curl_fallback_is_bounded_and_verified(self):
        def download(args, **kwargs):
            self.assertEqual(args[0], "curl")
            self.assertIn("--continue-at", args)
            self.assertIn("--fail", args)
            self.assertEqual(kwargs["timeout"], 900)
            self.target.with_suffix(".pilot-part").write_bytes(self.content)
        with patch.object(bootstrap.shutil, "which", side_effect=lambda name: "/usr/bin/curl" if name == "curl" else None):
            with patch.object(bootstrap.subprocess, "run", side_effect=download):
                bootstrap.fetch_model(self.root, self.item)
        self.assertEqual(self.target.read_bytes(), self.content)

    def test_missing_download_tools_fail_before_transfer(self):
        with patch.object(bootstrap.shutil, "which", return_value=None):
            with patch.object(bootstrap.subprocess, "run") as run:
                with self.assertRaisesRegex(RuntimeError, "requires aria2c or curl"):
                    bootstrap.fetch_model(self.root, self.item)
        run.assert_not_called()

    def test_bootstrap_error_visible_without_secret_details(self):
        bootstrap.record_failure(self.root, RuntimeError("secret-url-token"))
        raw = (self.root / "manifest-base.json").read_text()
        self.assertNotIn("secret-url-token", raw)
        data = json.loads(raw)
        self.assertTrue(data["pilot"]["bootstrap_failed"])
        self.assertFalse(data["pilot"]["production_approved"])

    def test_progress_contains_bytes_not_download_url(self):
        partial = self.root / "fixture.pilot-part"
        partial.write_bytes(b"abc")
        finished = unittest.mock.Mock()
        finished.wait.side_effect = [False, True]
        with patch("builtins.print") as output:
            bootstrap.download_progress(partial, 9, bootstrap.time.monotonic(), finished)
        data = json.loads(output.call_args.args[0])
        self.assertEqual(data["bytes"], 3)
        self.assertEqual(data["expected_bytes"], 9)
        self.assertNotIn("url", data)

    def test_concurrent_events_do_not_interleave(self):
        fragments = []
        def split_print(payload, **kwargs):
            fragments.append(payload)
            time.sleep(.001)
            fragments.append('\n')
        with patch('builtins.print', side_effect=split_print):
            threads = [threading.Thread(target=bootstrap.emit_event, args=({'event':i},))
                       for i in range(16)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=3)
            self.assertFalse(any(thread.is_alive() for thread in threads))
        events = [json.loads(line)['event'] for line in ''.join(fragments).splitlines()]
        self.assertEqual(sorted(events), list(range(16)))

    def test_known_provisioner_transform(self):
        source = (Path(__file__).parent.parent / "provision-video-factory-wan22.sh").read_bytes()
        result = bootstrap.candidate_provisioner(source)
        self.assertNotIn(b'fetch_file "$DIFFUSION_URL"', result)
        self.assertNotIn(b'fetch_file "$TEXT_ENCODER_URL"', result)
        self.assertNotIn(b'fetch_file "$VAE_URL"', result)
        self.assertIn(b'"models":[],"production_approved":false', result)
        self.assertIn(b"--disable-all-custom-nodes", result)
        self.assertIn(b"secrets.compare_digest", result)
        script = self.root / "patched.sh"
        script.write_bytes(result)
        subprocess.run(["bash", "-n", str(script)], check=True)

    def test_native_attention_opt_in_preserves_default(self):
        source = (Path(__file__).parent.parent / 'provision-video-factory-wan22.sh').read_bytes()
        default = bootstrap.candidate_provisioner(source)
        native = bootstrap.candidate_provisioner(source, 'pytorch')
        flag = b'      --use-pytorch-cross-attention \\\n'
        self.assertNotIn(flag, default)
        self.assertEqual(native.count(flag), 1)
        self.assertEqual(native.replace(flag, b''), default)
        self.assertNotIn(b'--fast', native)
        script = self.root / 'native.sh'
        script.write_bytes(native)
        subprocess.run(['bash','-n',str(script)],check=True)

    def test_arbitrary_attention_flags_rejected(self):
        for value in ['sage', '--fast', 'pytorch; touch bad', '']:
            with self.assertRaisesRegex(ValueError, 'Unsupported candidate'):
                bootstrap.candidate_provisioner(b'not evaluated', value)


if __name__ == "__main__":
    unittest.main()
