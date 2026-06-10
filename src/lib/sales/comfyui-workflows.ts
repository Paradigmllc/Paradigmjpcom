/**
 * lib/sales/comfyui-workflows.ts — ComfyUI ワークフローテンプレート
 *
 * 役割: プロスタジオ級動画制作のための ComfyUI ワークフロー JSON テンプレート。
 *       背景生成、アバター生成、動画生成、サムネイル生成の各ワークフローを提供。
 *
 * 設計原則:
 *   - 各ワークフローは ComfyUI API 互換の JSON 文字列テンプレート
 *   - プレースホルダーは {{PROMPT}} / {{NEGATIVE_PROMPT}} / {{SEED}} / {{TIMESTAMP}} 形式
 *   - 実際の値は comfyui-client.ts の generateComfyuiPrompt() で埋める
 *   - Flux / Stable Diffusion 3.5 / SDXL の各モデルに対応
 */

import type { ComfyuiWorkflowType } from "./comfyui-client"

/* ───── ワークフローテンプレート型 ───── */

export interface ComfyuiWorkflowTemplate {
  type: ComfyuiWorkflowType
  name: string
  description: string
  model: string
  /** JSON 文字列テンプレート。{{PROMPT}} / {{NEGATIVE_PROMPT}} / {{SEED}} / {{TIMESTAMP}} を含む */
  workflowJson: string
  expectedOutputs: string[]
  estimatedTimeSec: number
}

/* ───── 背景生成ワークフロー (Flux / SDXL) ───── */

const BACKGROUND_GENERATION_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "background_generation",
  name: "プロフェッショナル背景生成",
  description: "企業・業種に合わせたプロフェッショナルな背景素材を生成。会議室、オフィス、スタジオ、自然光など。",
  model: "flux-dev",
  workflowJson: `{"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["30",0]}},"4":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["30",0]}},"5":{"class_type":"EmptyLatentImage","inputs":{"width":1920,"height":1080,"batch_size":1}},"6":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":30,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["30",0],"positive":["3",0],"negative":["4",0],"latent_image":["5",0]}},"7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["30",1]}},"8":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_bg_{{TIMESTAMP}}","images":["7",0]}},"30":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}}}`,
  expectedOutputs: ["paradigm_bg_*.png"],
  estimatedTimeSec: 45,
}

/* ───── アバター生成ワークフロー (Flux + IP-Adapter) ───── */

const AVATAR_GENERATION_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "avatar_generation",
  name: "プロフェッショナルアバター生成",
  description: "ブランドに合ったプレゼンターアバターを生成。スーツ、カジュアル、業界に合わせた外見。",
  model: "flux-dev",
  workflowJson: `{"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["30",0]}},"4":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["30",0]}},"5":{"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":1024,"batch_size":1}},"6":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":35,"cfg":4.0,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["30",0],"positive":["3",0],"negative":["4",0],"latent_image":["5",0]}},"7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["30",1]}},"8":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_avatar_{{TIMESTAMP}}","images":["7",0]}},"30":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}}}`,
  expectedOutputs: ["paradigm_avatar_*.png"],
  estimatedTimeSec: 60,
}

/* ───── 動画生成ワークフロー (AnimateDiff / Stable Video Diffusion) ───── */

const VIDEO_GENERATION_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "video_generation",
  name: "プロフェッショナル動画生成",
  description: "AnimateDiff / Stable Video Diffusion を使ったプロフェッショナル動画生成。16フレーム、24fps。",
  model: "svd",
  workflowJson: `{"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["30",0]}},"4":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["30",0]}},"5":{"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":576,"batch_size":16}},"6":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":25,"cfg":3.0,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["30",0],"positive":["3",0],"negative":["4",0],"latent_image":["5",0]}},"7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["30",1]}},"8":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_video_{{TIMESTAMP}}","images":["7",0]}},"30":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"svd-fp16.safetensors"}}}`,
  expectedOutputs: ["paradigm_video_*.png"],
  estimatedTimeSec: 180,
}

/* ───── サムネイル生成ワークフロー ───── */

const THUMBNAIL_GENERATION_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "thumbnail_generation",
  name: "プロフェッショナルサムネイル生成",
  description: "YouTube / SNS 向けの高品質サムネイルを生成。テキスト配置を考慮した構図。",
  model: "flux-dev",
  workflowJson: `{"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["30",0]}},"4":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["30",0]}},"5":{"class_type":"EmptyLatentImage","inputs":{"width":1280,"height":720,"batch_size":1}},"6":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":25,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["30",0],"positive":["3",0],"negative":["4",0],"latent_image":["5",0]}},"7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["30",1]}},"8":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_thumb_{{TIMESTAMP}}","images":["7",0]}},"30":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}}}`,
  expectedOutputs: ["paradigm_thumb_*.png"],
  estimatedTimeSec: 30,
}

/* ───── B-Roll 生成ワークフロー ───── */

const BROLL_GENERATION_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "broll_generation",
  name: "B-Roll 素材生成",
  description: "動画に挿入する B-Roll 素材を生成。業界に合わせたイメージ映像。",
  model: "flux-dev",
  workflowJson: `{"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["30",0]}},"4":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["30",0]}},"5":{"class_type":"EmptyLatentImage","inputs":{"width":1920,"height":1080,"batch_size":1}},"6":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":25,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["30",0],"positive":["3",0],"negative":["4",0],"latent_image":["5",0]}},"7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["30",1]}},"8":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_broll_{{TIMESTAMP}}","images":["7",0]}},"30":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}}}`,
  expectedOutputs: ["paradigm_broll_*.png"],
  estimatedTimeSec: 40,
}

/* ───── LivePortrait 顔アニメーションワークフロー ───── */

const LIVEPORTRAIT_ANIMATION_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "liveportrait_animation",
  name: "LivePortrait 顔アニメーション",
  description: "静止画の顔写真をアニメーション化。口パク・表情変化・首振りを生成。プレゼンターアバターの動画化に使用。",
  model: "liveportrait",
  workflowJson: `{"1":{"class_type":"LoadImage","inputs":{"image":"{{SOURCE_IMAGE}}"},"_meta":{"title":"Load source image"}},"2":{"class_type":"LoadImage","inputs":{"image":"{{DRIVING_VIDEO}}"},"_meta":{"title":"Load driving video"}},"3":{"class_type":"LivePortraitKJ","inputs":{"source_image":["1",0],"driving_video":["2",0],"flag_do_crop":true,"flag_relative_motion":true,"flag_paste_back":true,"eyes_ratio":0.8,"lip_ratio":0.8,"head_movement":0.5,"expression_scale":1.0},"_meta":{"title":"LivePortrait animation"}},"4":{"class_type":"VideoCombine","inputs":{"images":["3",0],"frame_rate":30,"loop_count":1,"filename_prefix":"paradigm_liveportrait_{{TIMESTAMP}}","format":"video/mp4","pix_fmt":"yuv420p","crf":23,"save_output":true},"_meta":{"title":"Combine to video"}}}`,
  expectedOutputs: ["paradigm_liveportrait_*.mp4"],
  estimatedTimeSec: 120,
}

/* ───── AnimateDiff 動画生成ワークフロー ───── */

const ANIMATEDIFF_VIDEO_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "animatediff_video",
  name: "AnimateDiff 動画生成",
  description: "テキストプロンプトからアニメーション動画を生成。16フレーム、24fps。",
  model: "animatediff",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"animatediffModel.safetensors"}},"2":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["1",1]}},"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["1",1]}},"4":{"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":576,"batch_size":16}},"5":{"class_type":"AnimateDiffLoaderV1","inputs":{"model_name":"mm_sd_v15_v2.ckpt","latent":["4",0],"unet":["1",2]}},"6":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":25,"cfg":7.0,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["5",0],"positive":["2",0],"negative":["3",0],"latent_image":["4",0]}},"7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["1",3]}},"8":{"class_type":"VideoCombine","inputs":{"images":["7",0],"frame_rate":24,"loop_count":1,"filename_prefix":"paradigm_animatediff_{{TIMESTAMP}}","format":"video/mp4","pix_fmt":"yuv420p","crf":23,"save_output":true}}}`,
  expectedOutputs: ["paradigm_animatediff_*.mp4"],
  estimatedTimeSec: 300,
}

/* ───── Stable Video Diffusion 動画生成ワークフロー ───── */

const SVD_VIDEO_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "svd_video",
  name: "Stable Video Diffusion 動画生成",
  description: "静止画から動画を生成。SVD モデルを使用。14フレーム、25fps。",
  model: "svd",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"svd-fp16.safetensors"}},"2":{"class_type":"LoadImage","inputs":{"image":"{{SOURCE_IMAGE}}"}},"3":{"class_type":"SVDImg2Vid","inputs":{"images":["2",0],"width":1024,"height":576,"video_frames":14,"motion_bucket_id":127,"fps_id":25,"augmentation_level":0.02},"_meta":{"title":"SVD image to video"}},"4":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":20,"cfg":3.0,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["1",0],"positive":["3",0],"negative":["3",1],"latent_image":["3",2]}},"5":{"class_type":"VAEDecode","inputs":{"samples":["4",0],"vae":["1",1]}},"6":{"class_type":"VideoCombine","inputs":{"images":["5",0],"frame_rate":25,"loop_count":1,"filename_prefix":"paradigm_svd_{{TIMESTAMP}}","format":"video/mp4","pix_fmt":"yuv420p","crf":23,"save_output":true}}}`,
  expectedOutputs: ["paradigm_svd_*.mp4"],
  estimatedTimeSec: 240,
}

/* ───── Image-to-Video ワークフロー ───── */

const IMAGE_TO_VIDEO_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "image_to_video",
  name: "画像→動画変換",
  description: "任意の静止画から動画を生成。プロダクトイメージやグラフを動画化。",
  model: "svd",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"svd-fp16.safetensors"}},"2":{"class_type":"LoadImage","inputs":{"image":"{{SOURCE_IMAGE}}"}},"3":{"class_type":"SVDImg2Vid","inputs":{"images":["2",0],"width":1024,"height":576,"video_frames":14,"motion_bucket_id":127,"fps_id":25,"augmentation_level":0.02}},"4":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":20,"cfg":3.0,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["1",0],"positive":["3",0],"negative":["3",1],"latent_image":["3",2]}},"5":{"class_type":"VAEDecode","inputs":{"samples":["4",0],"vae":["1",1]}},"6":{"class_type":"VideoCombine","inputs":{"images":["5",0],"frame_rate":25,"loop_count":1,"filename_prefix":"paradigm_img2vid_{{TIMESTAMP}}","format":"video/mp4","pix_fmt":"yuv420p","crf":23,"save_output":true}}}`,
  expectedOutputs: ["paradigm_img2vid_*.mp4"],
  estimatedTimeSec: 180,
}

/* ───── Face Swap ワークフロー ───── */

const FACE_SWAP_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "face_swap",
  name: "フェイススワップ",
  description: "ソース画像の顔をターゲット画像に適用。アバターの顔差し替えに使用。",
  model: "insightface",
  workflowJson: `{"1":{"class_type":"LoadImage","inputs":{"image":"{{SOURCE_IMAGE}}"}},"2":{"class_type":"LoadImage","inputs":{"image":"{{TARGET_IMAGE}}"}},"3":{"class_type":"InsightFace","inputs":{"source":["1",0],"target":["2",0],"provider":"CUDA","detect_resolution":640,"swap_mode":"face_swap"}},"4":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_faceswap_{{TIMESTAMP}}","images":["3",0]}}}`,
  expectedOutputs: ["paradigm_faceswap_*.png"],
  estimatedTimeSec: 30,
}

/* ───── Super Resolution ワークフロー ───── */

const SUPER_RESOLUTION_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "super_resolution",
  name: "超解像度アップスケール",
  description: "低解像度の画像を4K品質にアップスケール。サムネイル・背景素材の品質向上。",
  model: "4x_upscaler",
  workflowJson: `{"1":{"class_type":"LoadImage","inputs":{"image":"{{SOURCE_IMAGE}}"}},"2":{"class_type":"ImageUpscaleWithModel","inputs":{"upscale_model":["3",0],"image":["1",0]}},"3":{"class_type":"UpscaleModelLoader","inputs":{"model_name":"4x_NMKD-Superscale-SP_178000_G.pth"}},"4":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_upscaled_{{TIMESTAMP}}","images":["2",0]}}}`,
  expectedOutputs: ["paradigm_upscaled_*.png"],
  estimatedTimeSec: 20,
}

/* ───── Inpainting ワークフロー ───── */

const INPAINTING_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "inpainting",
  name: "インペインティング（部分修正）",
  description: "画像の特定領域を修正・補完。不要な要素の除去や背景修正に使用。",
  model: "flux-dev",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}},"2":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["1",0]}},"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["1",0]}},"4":{"class_type":"LoadImage","inputs":{"image":"{{SOURCE_IMAGE}}"}},"5":{"class_type":"LoadImage","inputs":{"image":"{{MASK_IMAGE}}"}},"6":{"class_type":"VAEEncodeForInpaint","inputs":{"pixels":["4",0],"vae":["1",1],"mask":["5",0],"grow_mask_by":6}},"7":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":30,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":0.85,"model":["1",0],"positive":["2",0],"negative":["3",0],"latent_image":["6",0]}},"8":{"class_type":"VAEDecode","inputs":{"samples":["7",0],"vae":["1",1]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_inpaint_{{TIMESTAMP}}","images":["8",0]}}}`,
  expectedOutputs: ["paradigm_inpaint_*.png"],
  estimatedTimeSec: 45,
}

/* ───── Outpainting ワークフロー ───── */

const OUTPAINTING_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "outpainting",
  name: "アウトペインティング（領域拡張）",
  description: "画像の外側を拡張。16:9→9:16へのトリミング調整や背景拡張に使用。",
  model: "flux-dev",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}},"2":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["1",0]}},"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["1",0]}},"4":{"class_type":"LoadImage","inputs":{"image":"{{SOURCE_IMAGE}}"}},"5":{"class_type":"PadImage","inputs":{"image":["4",0],"width":1920,"height":1080,"feathering":40}},"6":{"class_type":"VAEEncode","inputs":{"pixels":["5",0],"vae":["1",1]}},"7":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":30,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":0.75,"model":["1",0],"positive":["2",0],"negative":["3",0],"latent_image":["6",0]}},"8":{"class_type":"VAEDecode","inputs":{"samples":["7",0],"vae":["1",1]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_outpaint_{{TIMESTAMP}}","images":["8",0]}}}`,
  expectedOutputs: ["paradigm_outpaint_*.png"],
  estimatedTimeSec: 50,
}

/* ───── ControlNet Pose ワークフロー ───── */

const CONTROLNET_POSE_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "controlnet_pose",
  name: "ControlNet ポーズ制御",
  description: "ポーズ画像を参照して人物の姿勢を制御。アバターのポーズ指定に使用。",
  model: "flux-dev",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}},"2":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["1",0]}},"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["1",0]}},"4":{"class_type":"LoadImage","inputs":{"image":"{{POSE_IMAGE}}"}},"5":{"class_type":"PoseEstimation","inputs":{"image":["4",0],"detect_resolution":512,"body":true,"hands":true,"face":true}},"6":{"class_type":"ControlNetLoader","inputs":{"control_net_name":"control_v11p_sd15_openpose.pth"}},"7":{"class_type":"ControlNetApply","inputs":{"conditioning":["2",0],"control_net":["6",0],"image":["5",0],"strength":0.8}},"8":{"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":1024,"batch_size":1}},"9":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":30,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["1",0],"positive":["7",0],"negative":["3",0],"latent_image":["8",0]}},"10":{"class_type":"VAEDecode","inputs":{"samples":["9",0],"vae":["1",1]}},"11":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_pose_{{TIMESTAMP}}","images":["10",0]}}}`,
  expectedOutputs: ["paradigm_pose_*.png"],
  estimatedTimeSec: 60,
}

/* ───── IP-Adapter スタイル転送ワークフロー ───── */

const IP_ADAPTER_STYLE_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "ip_adapter_style",
  name: "IP-Adapter スタイル転送",
  description: "参照画像のスタイルを生成画像に適用。ブランド統一のビジュアル生成に使用。",
  model: "flux-dev",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}},"2":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["1",0]}},"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["1",0]}},"4":{"class_type":"LoadImage","inputs":{"image":"{{STYLE_IMAGE}}"}},"5":{"class_type":"IPAdapterLoader","inputs":{"ipadapter_name":"ip-adapter-plus_sd15.safetensors"}},"6":{"class_type":"IPAdapterApply","inputs":{"ipadapter":["5",0],"conditioning":["2",0],"image":["4",0],"weight":0.7,"noise":0.3,"start_at":0.0,"end_at":1.0}},"7":{"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":1024,"batch_size":1}},"8":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":30,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["1",0],"positive":["6",0],"negative":["3",0],"latent_image":["7",0]}},"9":{"class_type":"VAEDecode","inputs":{"samples":["8",0],"vae":["1",1]}},"10":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_ipstyle_{{TIMESTAMP}}","images":["9",0]}}}`,
  expectedOutputs: ["paradigm_ipstyle_*.png"],
  estimatedTimeSec: 55,
}

/* ───── LoRA 適用ワークフロー ───── */

const LORA_APPLY_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "lora_apply",
  name: "LoRA モデル適用",
  description: "特定のLoRAモデルを適用して生成品質をカスタマイズ。ブランド固有のスタイルやキャラクター生成に使用。",
  model: "flux-dev",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}},"2":{"class_type":"CLIPTextEncode","inputs":{"text":"{{PROMPT}}","clip":["1",0]}},"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{NEGATIVE_PROMPT}}","clip":["1",0]}},"4":{"class_type":"LoRALoader","inputs":{"lora_name":"{{LORA_NAME}}","strength_model":{{LORA_STRENGTH}},"strength_clip":{{LORA_STRENGTH}},"model":["1",0],"clip":["1",1]}},"5":{"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":1024,"batch_size":1}},"6":{"class_type":"KSampler","inputs":{"seed":{{SEED}},"steps":30,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["4",0],"positive":["2",0],"negative":["3",0],"latent_image":["5",0]}},"7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["1",1]}},"8":{"class_type":"SaveImage","inputs":{"filename_prefix":"paradigm_lora_{{TIMESTAMP}}","images":["7",0]}}}`,
  expectedOutputs: ["paradigm_lora_*.png"],
  estimatedTimeSec: 50,
}

/* ───── モデルアンロードワークフロー ───── */

const MODEL_UNLOAD_WORKFLOW: ComfyuiWorkflowTemplate = {
  type: "model_unload",
  name: "モデルアンロード",
  description: "VRAM解放のためモデルをアンロード。連続生成時のメモリ管理に使用。",
  model: "any",
  workflowJson: `{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux-dev-fp8.safetensors"}},"2":{"class_type":"ModelUnloader","inputs":{"model":["1",0],"unload_vae":true,"unload_clip":true}}}`,
  expectedOutputs: [],
  estimatedTimeSec: 5,
}

/* ───── ワークフローチェーン（複数ワークフロー連結） ───── */

const WORKFLOW_CHAIN_TEMPLATE: ComfyuiWorkflowTemplate = {
  type: "workflow_chain",
  name: "ワークフローチェーン",
  description: "複数のワークフローを連結して実行。背景生成→LivePortrait→動画結合などのパイプライン。",
  model: "chain",
  workflowJson: `{"chain":[{{CHAIN_WORKFLOWS}}],"output":"{{CHAIN_OUTPUT}}"}`,
  expectedOutputs: ["paradigm_chain_*.mp4"],
  estimatedTimeSec: 600,
}

/* ───── ワークフローレジストリ ───── */

const WORKFLOW_REGISTRY: Record<ComfyuiWorkflowType, ComfyuiWorkflowTemplate> = {
  background_generation: BACKGROUND_GENERATION_WORKFLOW,
  avatar_generation: AVATAR_GENERATION_WORKFLOW,
  video_generation: VIDEO_GENERATION_WORKFLOW,
  thumbnail_generation: THUMBNAIL_GENERATION_WORKFLOW,
  broll_generation: BROLL_GENERATION_WORKFLOW,
  image_sequence: VIDEO_GENERATION_WORKFLOW,
  liveportrait_animation: LIVEPORTRAIT_ANIMATION_WORKFLOW,
  animatediff_video: ANIMATEDIFF_VIDEO_WORKFLOW,
  svd_video: SVD_VIDEO_WORKFLOW,
  image_to_video: IMAGE_TO_VIDEO_WORKFLOW,
  face_swap: FACE_SWAP_WORKFLOW,
  super_resolution: SUPER_RESOLUTION_WORKFLOW,
  inpainting: INPAINTING_WORKFLOW,
  outpainting: OUTPAINTING_WORKFLOW,
  controlnet_pose: CONTROLNET_POSE_WORKFLOW,
  ip_adapter_style: IP_ADAPTER_STYLE_WORKFLOW,
  lora_apply: LORA_APPLY_WORKFLOW,
  model_unload: MODEL_UNLOAD_WORKFLOW,
  workflow_chain: WORKFLOW_CHAIN_TEMPLATE,
  whisper_transcription: BACKGROUND_GENERATION_WORKFLOW,
  cosyvoice_tts: BACKGROUND_GENERATION_WORKFLOW,
  xttsv2_clone: BACKGROUND_GENERATION_WORKFLOW,
  edge_tts: BACKGROUND_GENERATION_WORKFLOW,
}


/**
 * ワークフローテンプレートを取得する。
 */
export function getComfyuiWorkflowTemplate(
  type: ComfyuiWorkflowType,
): ComfyuiWorkflowTemplate | null {
  return WORKFLOW_REGISTRY[type] ?? null
}

/**
 * 全ワークフローテンプレートの一覧を取得する。
 */
export function listComfyuiWorkflowTemplates(): ComfyuiWorkflowTemplate[] {
  return Object.values(WORKFLOW_REGISTRY)
}

/**
 * ワークフロー JSON にプロンプトとシードを注入する。
 * プレースホルダー {{PROMPT}}, {{NEGATIVE_PROMPT}}, {{SEED}}, {{TIMESTAMP}} を実際の値で置換。
 */
export function injectComfyuiWorkflowPrompt(
  template: ComfyuiWorkflowTemplate,
  params: {
    prompt: string
    negativePrompt?: string
    seed?: number
  },
): Record<string, unknown> {
  const timestamp = Date.now()
  const seed = params.seed ?? Math.floor(Math.random() * 2_147_483_647)

  const injected = template.workflowJson
    .replace(/"{{PROMPT}}"/g, JSON.stringify(params.prompt))
    .replace(/"{{NEGATIVE_PROMPT}}"/g, JSON.stringify(params.negativePrompt ?? "low quality, blurry, distorted, ugly, bad anatomy, watermark, text"))
    .replace(/\{\{SEED\}\}/g, String(seed))
    .replace(/\{\{TIMESTAMP\}\}/g, String(timestamp))

  try {
    return JSON.parse(injected) as Record<string, unknown>
  } catch (e) {
    console.error("[comfyui-workflows] JSON parse failed:", e instanceof Error ? e.message : String(e))
    return {}
  }
}

/**
 * ワークフロー実行に必要な推定時間を取得する（秒）。
 */
export function estimateWorkflowDuration(type: ComfyuiWorkflowType): number {
  return WORKFLOW_REGISTRY[type]?.estimatedTimeSec ?? 120
}

/**
 * ワークフロー名を取得する（日本語）。
 */
export function getWorkflowLabel(type: ComfyuiWorkflowType): string {
  const labels: Record<ComfyuiWorkflowType, string> = {
    background_generation: "背景素材生成",
    avatar_generation: "アバター生成",
    video_generation: "動画生成",
    image_sequence: "画像シーケンス生成",
    broll_generation: "B-Roll素材生成",
    thumbnail_generation: "サムネイル生成",
    liveportrait_animation: "LivePortrait アニメーション",
    whisper_transcription: "Whisper 文字起こし",
    cosyvoice_tts: "CosyVoice TTS",
    xttsv2_clone: "XTTSv2 音声クローン",
    edge_tts: "Edge-TTS",
    animatediff_video: "AnimateDiff 動画生成",
    svd_video: "SVD 動画生成",
    image_to_video: "画像→動画変換",
    face_swap: "顔入れ替え",
    super_resolution: "超解像",
    inpainting: "インペインティング",
    outpainting: "アウトペインティング",
    controlnet_pose: "ControlNet ポーズ",
    ip_adapter_style: "IP-Adapter スタイル転送",
    lora_apply: "LoRA 適用",
    model_unload: "モデルアンロード",
    workflow_chain: "ワークフローチェーン",
  }
  return labels[type] ?? type
}
