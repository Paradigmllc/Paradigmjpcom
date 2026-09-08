"""Official, pinned candidate artifacts; NOT production approvals."""
WAN_REPO = "Comfy-Org/Wan_2.2_ComfyUI_Repackaged"
WAN_REV = "c4f60d30c55a624e35427060fdd217579a6c1d77"
QWEN_REPO = "Comfy-Org/Qwen-Image_ComfyUI"
QWEN_REV = "7beb7b647f04469fbe64ba8adc2bb0d7e5e9f73f"
MODELS = [
    (WAN_REPO, WAN_REV, "diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors", 14294742832, "6122e79d55e0f235698d11d657f3b196c5273c830da00b2b013c5a048d5e6a42"),
    (WAN_REPO, WAN_REV, "diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors", 14294742832, "5471a457b6ac404202a5fbe6c11595a3d5641fc766b00f38763f72303fffc21e"),
    (WAN_REPO, WAN_REV, "text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors", 6735906897, "c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68"),
    (WAN_REPO, WAN_REV, "vae/wan_2.1_vae.safetensors", 253815318, "2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b"),
    (QWEN_REPO, QWEN_REV, "diffusion_models/qwen_image_2512_fp8_e4m3fn.safetensors", 20430679144, "5dc80554d5d83390046a2f4a94ece06afb7700bf7b0aaf8bde9769793875876b"),
    (QWEN_REPO, QWEN_REV, "text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors", 9384670680, "cb5636d852a0ea6a9075ab1bef496c0db7aef13c02350571e388aea959c5c0b4"),
    (QWEN_REPO, QWEN_REV, "vae/qwen_image_vae.safetensors", 253806246, "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f"),
]
COMFY_IMAGE = "vastai/comfy@sha256:694125bebb5b00d77878693770c9550602e9cbf644e9fe3d9b3b35ee27385e8d"
COMFY_REVISION = "700821e1364eaab0e8f21c538a2131719fec57bf"
PROVISION_REVISION = "be4b0f113016f725c23ead691ee7b579b22639b8"
PROVISION_SHA256 = "00d7f833e21eafa46f9a1ab4e16fd673149cc7788b70e7cce1ea87b78caeb0a2"

